import {
  CalendarProvider,
  type SyncableEvent,
  type PushResult,
  type DeleteResult,
  type RemoteEvent,
  type SyncResult,
  type CalDAVConfig,
  type SyncContext,
  type ListRemoteEventsOptions,
} from "@keeper.sh/integrations";
import { CalDAVClient } from "./caldav-client";
import { eventToICalString, parseICalToRemoteEvent } from "./ics-converter";
import {
  getCalDAVAccountsForUser,
  getUserEvents,
  getDecryptedPassword,
  type CalDAVAccount,
} from "./sync";

export interface CalDAVProviderOptions {
  providerId: string;
  providerName: string;
}

export class CalDAVProvider extends CalendarProvider<CalDAVConfig> {
  readonly name: string;
  readonly id: string;

  private client: CalDAVClient;

  constructor(
    config: CalDAVConfig,
    password: string,
    options: CalDAVProviderOptions = { providerId: "caldav", providerName: "CalDAV" },
  ) {
    super(config);
    this.id = options.providerId;
    this.name = options.providerName;
    this.client = new CalDAVClient({
      serverUrl: config.serverUrl,
      credentials: {
        username: config.username,
        password,
      },
    });
  }

  static async syncForUser(
    userId: string,
    context: SyncContext,
  ): Promise<SyncResult | null> {
    const accounts = await getCalDAVAccountsForUser(userId, "caldav");
    if (accounts.length === 0) return null;

    const localEvents = await getUserEvents(userId);

    const results = await Promise.all(
      accounts.map((account) =>
        CalDAVProvider.syncAccount(account, localEvents, context),
      ),
    );

    return results.reduce<SyncResult>(
      (combined, result) => ({
        added: combined.added + result.added,
        removed: combined.removed + result.removed,
      }),
      { added: 0, removed: 0 },
    );
  }

  protected static async syncAccount(
    account: CalDAVAccount,
    localEvents: SyncableEvent[],
    context: SyncContext,
    options: CalDAVProviderOptions = { providerId: "caldav", providerName: "CalDAV" },
  ): Promise<SyncResult> {
    const password = getDecryptedPassword(account.encryptedPassword);
    const provider = new CalDAVProvider(
      {
        destinationId: account.destinationId,
        userId: account.userId,
        serverUrl: account.serverUrl,
        username: account.username,
        calendarUrl: account.calendarUrl,
      },
      password,
      options,
    );
    return provider.sync(localEvents, context);
  }

  async pushEvents(events: SyncableEvent[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const event of events) {
      try {
        const uid = this.generateUid();
        const iCalString = eventToICalString(event, uid);

        await this.client.createCalendarObject({
          calendarUrl: this.config.calendarUrl,
          filename: `${uid}.ics`,
          iCalString,
        });

        results.push({ success: true, remoteId: uid });
      } catch (error) {
        this.childLog.error({ error }, "failed to push event");
        results.push({ success: false, error: "Failed to push event" });
      }
    }

    return results;
  }

  async deleteEvents(eventIds: string[]): Promise<DeleteResult[]> {
    const results: DeleteResult[] = [];

    for (const uid of eventIds) {
      try {
        await this.client.deleteCalendarObject({
          calendarUrl: this.config.calendarUrl,
          filename: `${uid}.ics`,
        });
        results.push({ success: true });
      } catch (error) {
        const is404 = error instanceof Error && error.message.includes("404");
        if (is404) {
          results.push({ success: true });
        } else {
          this.childLog.error({ error, uid }, "failed to delete event");
          results.push({ success: false, error: "Failed to delete event" });
        }
      }
    }

    return results;
  }

  async listRemoteEvents(options: ListRemoteEventsOptions): Promise<RemoteEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const objects = await this.client.fetchCalendarObjects({
      calendarUrl: this.config.calendarUrl,
      timeRange: {
        start: today.toISOString(),
        end: options.until.toISOString(),
      },
    });

    this.childLog.debug({ objectCount: objects.length }, "fetched calendar objects");

    const remoteEvents: RemoteEvent[] = [];

    for (const obj of objects) {
      if (!obj.data) {
        this.childLog.trace({ url: obj.url }, "object has no data");
        continue;
      }

      const parsed = parseICalToRemoteEvent(obj.data);
      if (!parsed) {
        this.childLog.trace({ url: obj.url }, "failed to parse object");
        continue;
      }

      if (this.isKeeperEvent(parsed.uid)) {
        remoteEvents.push(parsed);
      } else {
        this.childLog.trace({ uid: parsed.uid }, "not a keeper event");
      }
    }

    this.childLog.debug({ count: remoteEvents.length }, "listed remote events");
    return remoteEvents;
  }
}
