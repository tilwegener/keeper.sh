import type {
  SyncableEvent,
  PushResult,
  DeleteResult,
  SyncResult,
  RemoteEvent,
  ProviderConfig,
  SyncOperation,
  SlotOperations,
  ListRemoteEventsOptions,
} from "./types";
import type { SyncStatus } from "@keeper.sh/data-schemas";
import { generateEventUid, isKeeperEvent } from "./event-identity";
import { isSyncCurrent, type SyncContext } from "./sync-coordinator";
import { log } from "@keeper.sh/log";
import { emit } from "@keeper.sh/broadcast";
import { database } from "@keeper.sh/database";
import { syncStatusTable } from "@keeper.sh/database/schema";

export abstract class CalendarProvider<
  TConfig extends ProviderConfig = ProviderConfig,
> {
  abstract readonly name: string;
  abstract readonly id: string;

  protected readonly childLog = log.child({ provider: this.constructor.name });

  constructor(protected config: TConfig) {}

  abstract pushEvents(events: SyncableEvent[]): Promise<PushResult[]>;
  abstract deleteEvents(eventIds: string[]): Promise<DeleteResult[]>;
  abstract listRemoteEvents(options: ListRemoteEventsOptions): Promise<RemoteEvent[]>;

  async sync(
    localEvents: SyncableEvent[],
    context: SyncContext,
  ): Promise<SyncResult> {
    const { userId } = this.config;

    this.childLog.debug(
      {
        userId,
        localCount: localEvents.length,
        generation: context.generation,
      },
      "starting sync",
    );

    this.emitStatus({
      status: "syncing",
      stage: "fetching",
      localEventCount: localEvents.length,
      remoteEventCount: 0,
      inSync: false,
    });

    const isLatestSync = await isSyncCurrent(context);

    if (!isLatestSync) {
      this.childLog.debug({ userId }, "sync superseded before fetch");
      return { added: 0, removed: 0 };
    }

    const maxEndTime = localEvents.reduce<Date | undefined>(
      (max, event) => (!max || event.endTime > max ? event.endTime : max),
      undefined,
    );

    if (!maxEndTime) {
      this.childLog.debug({ userId }, "no local events to sync");
      await this.persistAndEmitFinalStatus(0, 0);
      return { added: 0, removed: 0 };
    }

    const remoteEvents = await this.listRemoteEvents({ until: maxEndTime });

    if (!isLatestSync) {
      this.childLog.debug({ userId }, "sync superseded after fetch");
      return { added: 0, removed: 0 };
    }

    this.emitStatus({
      status: "syncing",
      stage: "comparing",
      localEventCount: localEvents.length,
      remoteEventCount: remoteEvents.length,
      inSync: false,
    });

    const operations = this.diffEvents(localEvents, remoteEvents);
    const addCount = operations.filter((op) => op.type === "add").length;
    const removeCount = operations.filter((op) => op.type === "remove").length;

    this.childLog.debug(
      { userId, toAddCount: addCount, toRemoveCount: removeCount },
      "diff complete",
    );

    if (operations.length === 0) {
      this.childLog.debug({ userId }, "destination in sync");
      await this.persistAndEmitFinalStatus(
        localEvents.length,
        remoteEvents.length,
      );
      return { added: 0, removed: 0 };
    }

    const processed = await this.processOperations(operations, {
      localEventCount: localEvents.length,
      remoteEventCount: remoteEvents.length,
      context,
    });

    if (!(await isSyncCurrent(context))) {
      this.childLog.debug({ userId }, "sync superseded during processing");
      return processed;
    }

    const finalRemoteCount =
      remoteEvents.length + processed.added - processed.removed;
    await this.persistAndEmitFinalStatus(localEvents.length, finalRemoteCount);

    this.childLog.info(
      { userId, added: processed.added, removed: processed.removed },
      "sync complete",
    );

    return processed;
  }

  private async processOperations(
    operations: SyncOperation[],
    params: {
      localEventCount: number;
      remoteEventCount: number;
      context: SyncContext;
    },
  ): Promise<SyncResult> {
    const total = operations.length;
    let current = 0;
    let added = 0;
    let removed = 0;

    for (const operation of operations) {
      if (!(await isSyncCurrent(params.context))) {
        this.childLog.debug("sync superseded, stopping processing");
        break;
      }

      const eventTime = this.getOperationEventTime(operation);

      this.emitStatus({
        status: "syncing",
        stage: "processing",
        localEventCount: params.localEventCount,
        remoteEventCount: params.remoteEventCount,
        progress: { current, total },
        lastOperation: {
          type: operation.type,
          eventTime: eventTime.toISOString(),
        },
        inSync: false,
      });

      if (operation.type === "add") {
        await this.pushEvents([operation.event]);
        added++;
      } else {
        await this.deleteEvents([operation.uid]);
        removed++;
      }

      current++;
    }

    return { added, removed };
  }

  private getOperationEventTime(operation: SyncOperation): Date {
    if (operation.type === "add") {
      return operation.event.startTime;
    }
    return operation.startTime;
  }

  private emitStatus(status: Omit<SyncStatus, "destinationId">): void {
    emit(this.config.userId, "sync:status", {
      destinationId: this.config.destinationId,
      ...status,
    });
  }

  private async persistAndEmitFinalStatus(
    localEventCount: number,
    remoteEventCount: number,
  ): Promise<void> {
    const { destinationId } = this.config;
    const now = new Date();

    await database
      .insert(syncStatusTable)
      .values({
        destinationId,
        localEventCount,
        remoteEventCount,
        lastSyncedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [syncStatusTable.destinationId],
        set: {
          localEventCount,
          remoteEventCount,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });

    this.emitStatus({
      status: "idle",
      localEventCount,
      remoteEventCount,
      lastSyncedAt: now.toISOString(),
      inSync: true,
    });
  }

  private diffEvents(
    localEvents: SyncableEvent[],
    remoteEvents: RemoteEvent[],
  ): SyncOperation[] {
    const timeKey = (start: Date, end: Date) =>
      `${start.getTime()}:${end.getTime()}`;

    const localBySlot = new Map<string, SyncableEvent[]>();
    for (const event of localEvents) {
      const key = timeKey(event.startTime, event.endTime);
      const slotEvents = localBySlot.get(key) ?? [];
      slotEvents.push(event);
      localBySlot.set(key, slotEvents);
    }

    const remoteBySlot = new Map<string, RemoteEvent[]>();
    for (const event of remoteEvents) {
      const key = timeKey(event.startTime, event.endTime);
      const slotEvents = remoteBySlot.get(key) ?? [];
      slotEvents.push(event);
      remoteBySlot.set(key, slotEvents);
    }

    const allSlots = new Set([...localBySlot.keys(), ...remoteBySlot.keys()]);
    const slotOperations: SlotOperations[] = [];

    for (const slot of allSlots) {
      const localSlotEvents = localBySlot.get(slot) ?? [];
      const remoteSlotEvents = remoteBySlot.get(slot) ?? [];

      const [localSlotEvent] = localSlotEvents;
      const [remoteSlotEvent] = remoteSlotEvents;

      const operations: SyncOperation[] = [];

      const startTime = localSlotEvent?.startTime ?? remoteSlotEvent?.startTime;
      if (!startTime) continue;

      const diff = localSlotEvents.length - remoteSlotEvents.length;

      if (diff > 0) {
        for (const event of localSlotEvents.slice(0, diff)) {
          operations.push({ type: "add", event });
        }
      } else if (diff < 0) {
        const surplus = -diff;
        for (const event of remoteSlotEvents.slice(0, surplus)) {
          operations.push({
            type: "remove",
            uid: event.uid,
            startTime: event.startTime,
          });
        }
      }

      if (operations.length > 0) {
        slotOperations.push({ startTime: startTime.getTime(), operations });
      }
    }

    slotOperations.sort((first, second) => first.startTime - second.startTime);
    return slotOperations.flatMap((slot) => slot.operations);
  }

  protected generateUid(): string {
    return generateEventUid();
  }

  protected isKeeperEvent(uid: string): boolean {
    return isKeeperEvent(uid);
  }
}
