import type {
  SyncableEvent,
  PushResult,
  DeleteResult,
  SyncResult,
  RemoteEvent,
  ProviderConfig,
} from "./types";
import { generateEventUid, isKeeperEvent } from "./event-identity";
import { log } from "@keeper.sh/log";
import { emit } from "@keeper.sh/broadcast";
import { database } from "@keeper.sh/database";
import { syncStatusTable } from "@keeper.sh/database/schema";

export abstract class CalendarProvider<TConfig extends ProviderConfig = ProviderConfig> {
  abstract readonly name: string;
  abstract readonly id: string;

  protected readonly childLog = log.child({ provider: this.constructor.name });

  constructor(protected config: TConfig) {}

  abstract pushEvents(events: SyncableEvent[]): Promise<PushResult[]>;
  abstract deleteEvents(eventIds: string[]): Promise<DeleteResult[]>;
  abstract listRemoteEvents(): Promise<RemoteEvent[]>;

  async sync(localEvents: SyncableEvent[]): Promise<SyncResult> {
    this.childLog.debug(
      { userId: this.config.userId, localCount: localEvents.length },
      "starting sync",
    );

    const remoteEvents = await this.listRemoteEvents();
    const { toAdd, toRemove } = this.diffEvents(localEvents, remoteEvents);

    this.childLog.debug(
      {
        userId: this.config.userId,
        toAddCount: toAdd.length,
        toRemoveCount: toRemove.length,
      },
      "diff complete",
    );

    const inSync = toAdd.length === 0 && toRemove.length === 0;

    if (inSync) {
      this.childLog.debug({ userId: this.config.userId }, "destination in sync");
      await this.updateSyncStatus(localEvents.length, remoteEvents.length, true);
      return { added: 0, removed: 0 };
    }

    if (toAdd.length > 0) {
      await this.pushEvents(toAdd);
    }

    if (toRemove.length > 0) {
      await this.deleteEvents(toRemove);
    }

    const finalRemoteCount = remoteEvents.length + toAdd.length - toRemove.length;
    await this.updateSyncStatus(localEvents.length, finalRemoteCount, true);

    this.childLog.info(
      { userId: this.config.userId, added: toAdd.length, removed: toRemove.length },
      "sync complete",
    );

    return { added: toAdd.length, removed: toRemove.length };
  }

  private async updateSyncStatus(
    localEventCount: number,
    remoteEventCount: number,
    inSync: boolean,
  ): Promise<void> {
    const { userId } = this.config;
    const now = new Date();

    await database
      .insert(syncStatusTable)
      .values({
        userId,
        provider: this.id,
        localEventCount,
        remoteEventCount,
        lastSyncedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [syncStatusTable.userId, syncStatusTable.provider],
        set: {
          localEventCount,
          remoteEventCount,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });

    emit(userId, "sync:status", {
      provider: this.id,
      localEventCount,
      remoteEventCount,
      lastSyncedAt: now.toISOString(),
      inSync,
    });
  }

  private diffEvents(
    localEvents: SyncableEvent[],
    remoteEvents: RemoteEvent[],
  ): { toAdd: SyncableEvent[]; toRemove: string[] } {
    const remoteUidSet = new Set<string>();
    for (const event of remoteEvents) {
      remoteUidSet.add(event.uid);
    }

    const localUidToEvent = new Map<string, SyncableEvent>();
    for (const event of localEvents) {
      const uid = this.generateUid(event);
      localUidToEvent.set(uid, event);
    }

    const toAdd: SyncableEvent[] = [];
    const toRemove: string[] = [];

    for (const [uid, event] of localUidToEvent) {
      if (!remoteUidSet.has(uid)) {
        toAdd.push(event);
      }
    }

    for (const uid of remoteUidSet) {
      if (!localUidToEvent.has(uid)) {
        toRemove.push(uid);
      }
    }

    return { toAdd, toRemove };
  }

  protected generateUid(event: SyncableEvent): string {
    return generateEventUid(this.config.userId, event);
  }

  protected isKeeperEvent(uid: string): boolean {
    return isKeeperEvent(uid);
  }
}
