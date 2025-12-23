import {
  CalendarProvider,
  type SyncableEvent,
  type PushResult,
  type DeleteResult,
} from "@keeper.sh/integrations";
import { log as baseLog } from "@keeper.sh/log";

const log = baseLog.child({ provider: "google-calendar" });

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3/";

interface GoogleEventResource {
  id?: string;
  iCalUID?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
}

interface GoogleApiError {
  error?: { message?: string; code?: number };
}

export class GoogleCalendarProvider extends CalendarProvider {
  readonly name = "Google Calendar";
  readonly id = "google";

  private get calendarId(): string {
    return this.config.calendarId ?? "primary";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async pushEvents(events: SyncableEvent[]): Promise<PushResult[]> {
    log.info({ count: events.length, calendarId: this.calendarId }, "pushing events");
    const results = await Promise.all(events.map((event) => this.pushEvent(event)));
    const succeeded = results.filter(({ success }) => success).length;
    log.info({ succeeded, failed: results.length - succeeded }, "push complete");
    return results;
  }

  async deleteEvents(eventIds: string[]): Promise<DeleteResult[]> {
    log.info({ count: eventIds.length, calendarId: this.calendarId }, "deleting events");
    const results = await Promise.all(eventIds.map((eventId) => this.deleteEvent(eventId)));
    const succeeded = results.filter(({ success }) => success).length;
    log.info({ succeeded, failed: results.length - succeeded }, "delete complete");
    return results;
  }

  private async pushEvent(event: SyncableEvent): Promise<PushResult> {
    const uid = this.generateUid(event);
    const resource = this.toGoogleEvent(event, uid);

    try {
      const existing = await this.findEventByUid(uid);

      if (existing?.id) {
        log.debug({ uid, eventId: existing.id }, "updating existing event");
        return this.updateEvent(existing.id, resource);
      }

      log.debug({ uid }, "creating new event");
      return this.createEvent(resource);
    } catch (error) {
      log.error({ uid, error }, "failed to push event");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createEvent(
    resource: GoogleEventResource,
  ): Promise<PushResult> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.calendarId)}/events`,
      GOOGLE_CALENDAR_API,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      const { error } = (await response.json()) as GoogleApiError;
      log.error({ status: response.status, error }, "create event failed");
      return {
        success: false,
        error: error?.message ?? response.statusText,
      };
    }

    const { id: remoteId } = (await response.json()) as GoogleEventResource;
    log.debug({ remoteId }, "event created");
    return { success: true, remoteId };
  }

  private async updateEvent(
    eventId: string,
    resource: GoogleEventResource,
  ): Promise<PushResult> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(eventId)}`,
      GOOGLE_CALENDAR_API,
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      const { error } = (await response.json()) as GoogleApiError;
      log.error({ status: response.status, eventId, error }, "update event failed");
      return {
        success: false,
        error: error?.message ?? response.statusText,
      };
    }

    const { id: remoteId } = (await response.json()) as GoogleEventResource;
    log.debug({ remoteId }, "event updated");
    return { success: true, remoteId };
  }

  private async deleteEvent(uid: string): Promise<DeleteResult> {
    try {
      const existing = await this.findEventByUid(uid);

      if (!existing?.id) {
        log.debug({ uid }, "event not found, skipping delete");
        return { success: true };
      }

      const url = new URL(
        `calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(existing.id)}`,
        GOOGLE_CALENDAR_API,
      );

      const response = await fetch(url, {
        method: "DELETE",
        headers: this.headers,
      });

      if (!response.ok && response.status !== 404) {
        const { error } = (await response.json()) as GoogleApiError;
        log.error({ status: response.status, uid, error }, "delete event failed");
        return {
          success: false,
          error: error?.message ?? response.statusText,
        };
      }

      log.debug({ uid, eventId: existing.id }, "event deleted");
      return { success: true };
    } catch (error) {
      log.error({ uid, error }, "failed to delete event");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async findEventByUid(
    uid: string,
  ): Promise<GoogleEventResource | null> {
    const url = new URL(
      `calendars/${encodeURIComponent(this.calendarId)}/events`,
      GOOGLE_CALENDAR_API,
    );

    url.searchParams.set("iCalUID", uid);

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      log.warn({ status: response.status, uid }, "failed to find event by uid");
      return null;
    }

    const { items } = (await response.json()) as { items?: GoogleEventResource[] };
    return items?.[0] ?? null;
  }

  private toGoogleEvent(
    event: SyncableEvent,
    uid: string,
  ): GoogleEventResource {
    return {
      iCalUID: uid,
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
    };
  }
}
