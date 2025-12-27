import { createDAVClient } from "tsdav";
import { log } from "@keeper.sh/log";

export interface CalDAVClientConfig {
  serverUrl: string;
  credentials: {
    username: string;
    password: string;
  };
}

export interface CalendarInfo {
  url: string;
  displayName: string;
  ctag?: string;
}

export interface CalendarObject {
  url: string;
  etag?: string;
  data?: string;
}

const childLog = log.child({ module: "caldav-client" });

type DAVClientInstance = Awaited<ReturnType<typeof createDAVClient>>;

export class CalDAVClient {
  private client: DAVClientInstance | null = null;
  private config: CalDAVClientConfig;

  constructor(config: CalDAVClientConfig) {
    this.config = config;
  }

  private async getClient(): Promise<DAVClientInstance> {
    if (!this.client) {
      childLog.debug(
        { serverUrl: this.config.serverUrl },
        "creating CalDAV client",
      );
      this.client = await createDAVClient({
        serverUrl: this.config.serverUrl,
        credentials: this.config.credentials,
        authMethod: "Basic",
        defaultAccountType: "caldav",
      });
    }
    return this.client;
  }

  async discoverCalendars(): Promise<CalendarInfo[]> {
    const client = await this.getClient();
    const calendars = await client.fetchCalendars();

    childLog.debug({ count: calendars.length }, "discovered calendars");

    return calendars.map(({ url, displayName, ctag }) => ({
      url,
      ctag,
      displayName:
        typeof displayName === "string" ? displayName : "Unnamed Calendar",
    }));
  }

  async createCalendarObject(params: {
    calendarUrl: string;
    filename: string;
    iCalString: string;
  }): Promise<void> {
    const client = await this.getClient();

    childLog.debug(
      { calendarUrl: params.calendarUrl, filename: params.filename },
      "creating calendar object",
    );

    await client.createCalendarObject({
      calendar: { url: params.calendarUrl },
      filename: params.filename,
      iCalString: params.iCalString,
    });
  }

  async deleteCalendarObject(params: {
    calendarUrl: string;
    filename: string;
  }): Promise<void> {
    const client = await this.getClient();
    const objectUrl = this.normalizeUrl(params.calendarUrl, params.filename);

    childLog.debug({ objectUrl }, "deleting calendar object");

    await client.deleteCalendarObject({
      calendarObject: { url: objectUrl },
    });
  }

  async fetchCalendarObjects(params: {
    calendarUrl: string;
    timeRange?: { start: string; end: string };
  }): Promise<CalendarObject[]> {
    const client = await this.getClient();

    const timeRange = params.timeRange
      ? {
          start: params.timeRange.start,
          end: params.timeRange.end,
        }
      : undefined;

    childLog.debug(
      { calendarUrl: params.calendarUrl, timeRange },
      "fetching calendar objects",
    );

    const objects = await client.fetchCalendarObjects({
      calendar: { url: params.calendarUrl },
      timeRange,
    });

    childLog.debug(
      { count: objects.length, withData: objects.filter((o) => o.data).length },
      "fetched objects",
    );

    return objects;
  }

  private normalizeUrl(calendarUrl: string, filename: string): string {
    const base = calendarUrl.endsWith("/") ? calendarUrl : `${calendarUrl}/`;
    return `${base}${filename}`;
  }
}

export const createCalDAVClient = (
  config: CalDAVClientConfig,
): CalDAVClient => {
  return new CalDAVClient(config);
};
