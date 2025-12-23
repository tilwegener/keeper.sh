import { type } from "arktype";

export const planSchema = type("'free' | 'pro'");
export type Plan = typeof planSchema.infer;

export const billingPeriodSchema = type("'monthly' | 'yearly'");
export type BillingPeriod = typeof billingPeriodSchema.infer;

export const createSourceSchema = type({
  name: "string",
  url: "string",
});

export type CreateSource = typeof createSourceSchema.infer;

export const stringSchema = type("string");

export const googleEventSchema = type({
  "id?": "string",
  "iCalUID?": "string",
  "summary?": "string",
  "description?": "string",
  "start?": { "dateTime?": "string", "timeZone?": "string" },
  "end?": { "dateTime?": "string", "timeZone?": "string" },
});
export type GoogleEvent = typeof googleEventSchema.infer;

export const googleEventListSchema = type({
  "items?": googleEventSchema.array(),
  "nextPageToken?": "string",
});
export type GoogleEventList = typeof googleEventListSchema.infer;

export const googleApiErrorSchema = type({
  "error?": { "message?": "string", "code?": "number" },
});
export type GoogleApiError = typeof googleApiErrorSchema.infer;

export const googleTokenResponseSchema = type({
  access_token: "string",
  expires_in: "number",
  "refresh_token?": "string",
  scope: "string",
  token_type: "string",
});
export type GoogleTokenResponse = typeof googleTokenResponseSchema.infer;

export const socketMessageSchema = type({
  event: "string",
  "data?": "unknown",
});
export type SocketMessage = typeof socketMessageSchema.infer;

export const syncStatusSchema = type({
  provider: "string",
  status: "'idle' | 'syncing'",
  "stage?": "'fetching' | 'comparing' | 'pushing' | 'deleting'",
  localEventCount: "number",
  remoteEventCount: "number",
  "progress?": { current: "number", total: "number" },
  "lastSyncedAt?": "string",
  inSync: "boolean",
});
export type SyncStatus = typeof syncStatusSchema.infer;

export const broadcastMessageSchema = type({
  userId: "string",
  event: "string",
  data: "unknown",
});
export type BroadcastMessage = typeof broadcastMessageSchema.infer;
