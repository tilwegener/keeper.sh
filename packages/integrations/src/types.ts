export interface SyncableEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  summary: string;
  description?: string;
  sourceId: string;
  sourceName?: string;
  sourceUrl: string;
}

export interface PushResult {
  success: boolean;
  remoteId?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface SyncResult {
  added: number;
  removed: number;
}

export interface RemoteEvent {
  uid: string;
  startTime: Date;
  endTime: Date;
}

export type SyncOperation =
  | { type: "add"; event: SyncableEvent }
  | { type: "remove"; uid: string; startTime: Date };

export interface SlotOperations {
  startTime: number;
  operations: SyncOperation[];
}

export interface ListRemoteEventsOptions {
  until: Date;
}

export interface ProviderConfig {
  userId: string;
  destinationId: string;
}

export interface GoogleCalendarConfig extends ProviderConfig {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  calendarId: string;
}

export interface CalDAVConfig extends ProviderConfig {
  serverUrl: string;
  username: string;
  calendarUrl: string;
}
