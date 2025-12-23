import {
  CalendarProvider,
  type SyncableEvent,
  type PushResult,
  type DeleteResult,
  type GoogleCalendarConfig,
} from "@keeper.sh/integrations";
import {
  googleEventSchema,
  googleEventListSchema,
  googleApiErrorSchema,
  type GoogleEvent,
} from "@keeper.sh/data-schemas";
import { log } from "@keeper.sh/log";

const childLog = log.child({ provider: "google-calendar" });

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3/";

export class GoogleCalendarProvider extends CalendarProvider<GoogleCalendarConfig> {
  readonly name = "Google Calendar";
  readonly id = "google";

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async pushEvents(events: SyncableEvent[]): Promise<PushResult[]> {
    childLog.info({ count: events.length, calendarId: this.config.calendarId }, "pushing events");
    const results = await Promise.all(events.map((event) => this.pushEvent(event)));
    const succeeded = results.filter(({ success }) => success).length;
    childLog.info({ succeeded, failed: results.length - succeeded }, "push complete");
    return results;
  }

  async deleteEvents(eventIds: string[]): Promise<DeleteResult[]> {
    childLog.info({ count: eventIds.length, calendarId: this.config.calendarId }, "deleting events");
    const results = await Promise.all(eventIds.map((eventId) => this.deleteEvent(eventId)));
    const succeeded = results.filter(({ success }) => success).length;
    childLog.info({ succeeded, failed: results.length - succeeded }, "delete complete");
    return results;
  }

  private async pushEvent(event: SyncableEvent): Promise<PushResult> {
    const uid = this.generateUid(event);
    const resource = this.toGoogleEvent(event, uid);

    try {
      const existing = await this.findEventByUid(uid);

      if (existing?.id) {
        childLog.debug({ uid, eventId: existing.id }, "updating existing event");
        return this.updateEvent(existing.id, resource);
      }

      childLog.debug({ uid }, "creating new event");
      return this.createEvent(resource);
    } catch (error) {
      childLog.error({ uid, error }, "failed to push event");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createEvent(resource: GoogleEvent): Promise<PushResult> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.config.calendarId)}/events`,
      GOOGLE_CALENDAR_API,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      const body = await response.json();
      const { error } = googleApiErrorSchema.assert(body);
      childLog.error({ status: response.status, error }, "create event failed");
      return {
        success: false,
        error: error?.message ?? response.statusText,
      };
    }

    const body = await response.json();
    const { id: remoteId } = googleEventSchema.assert(body);
    childLog.debug({ remoteId }, "event created");
    return { success: true, remoteId };
  }

  private async updateEvent(
    eventId: string,
    resource: GoogleEvent,
  ): Promise<PushResult> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(eventId)}`,
      GOOGLE_CALENDAR_API,
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      const body = await response.json();
      const { error } = googleApiErrorSchema.assert(body);
      childLog.error({ status: response.status, eventId, error }, "update event failed");
      return {
        success: false,
        error: error?.message ?? response.statusText,
      };
    }

    const body = await response.json();
    const { id: remoteId } = googleEventSchema.assert(body);
    childLog.debug({ remoteId }, "event updated");
    return { success: true, remoteId };
  }

  private async deleteEvent(uid: string): Promise<DeleteResult> {
    try {
      const existing = await this.findEventByUid(uid);

      if (!existing?.id) {
        childLog.debug({ uid }, "event not found, skipping delete");
        return { success: true };
      }

      const url = new URL(
        `calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(existing.id)}`,
        GOOGLE_CALENDAR_API,
      );

      const response = await fetch(url, {
        method: "DELETE",
        headers: this.headers,
      });

      if (!response.ok && response.status !== 404) {
        const body = await response.json();
        const { error } = googleApiErrorSchema.assert(body);
        childLog.error({ status: response.status, uid, error }, "delete event failed");
        return {
          success: false,
          error: error?.message ?? response.statusText,
        };
      }

      childLog.debug({ uid, eventId: existing.id }, "event deleted");
      return { success: true };
    } catch (error) {
      childLog.error({ uid, error }, "failed to delete event");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async findEventByUid(uid: string): Promise<GoogleEvent | null> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.config.calendarId)}/events`,
      GOOGLE_CALENDAR_API,
    );

    url.searchParams.set("iCalUID", uid);

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      childLog.warn({ status: response.status, uid }, "failed to find event by uid");
      return null;
    }

    const body = await response.json();
    const { items } = googleEventListSchema.assert(body);
    return items?.[0] ?? null;
  }

  async listKeeperEvents(): Promise<GoogleEvent[]> {
    const keeperEvents: GoogleEvent[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(
        `calendars/${encodeURIComponent(this.config.calendarId)}/events`,
        GOOGLE_CALENDAR_API,
      );

      url.searchParams.set("maxResults", "2500");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const body = await response.json();
        const { error } = googleApiErrorSchema.assert(body);
        childLog.error({ status: response.status, error }, "failed to list events");
        throw new Error(error?.message ?? response.statusText);
      }

      const body = await response.json();
      const data = googleEventListSchema.assert(body);

      for (const event of data.items ?? []) {
        if (event.iCalUID && this.isKeeperEvent(event.iCalUID)) {
          keeperEvents.push(event);
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    childLog.debug({ count: keeperEvents.length }, "listed keeper events");
    return keeperEvents;
  }

  private toGoogleEvent(event: SyncableEvent, uid: string): GoogleEvent {
    return {
      iCalUID: uid,
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
    };
  }
}
