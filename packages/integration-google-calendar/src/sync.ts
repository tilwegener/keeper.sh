import { database, account } from "@keeper.sh/database";
import {
  remoteICalSourcesTable,
  eventStatesTable,
  userSubscriptionsTable,
} from "@keeper.sh/database/schema";
import { googleTokenResponseSchema, type GoogleEvent } from "@keeper.sh/data-schemas";
import env from "@keeper.sh/env/auth";
import { log } from "@keeper.sh/log";
import { eq } from "drizzle-orm";
import type { Plan } from "@keeper.sh/premium";
import { generateEventUid, type SyncableEvent } from "@keeper.sh/integrations";
import { GoogleCalendarProvider } from "./provider";

const childLog = log.child({ module: "google-calendar-sync" });

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface GoogleAccount {
  userId: string;
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
}

export const getGoogleAccountsByPlan = async (
  targetPlan: Plan,
): Promise<GoogleAccount[]> => {
  const results = await database
    .select({
      userId: account.userId,
      accountId: account.accountId,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
      plan: userSubscriptionsTable.plan,
    })
    .from(account)
    .leftJoin(
      userSubscriptionsTable,
      eq(account.userId, userSubscriptionsTable.userId),
    )
    .where(eq(account.providerId, "google"));

  const accounts: GoogleAccount[] = [];

  for (const result of results) {
    const { plan, accessToken, refreshToken, accessTokenExpiresAt } = result;
    const userPlan = plan ?? "free";

    if (
      userPlan !== targetPlan ||
      accessToken === null ||
      refreshToken === null ||
      accessTokenExpiresAt === null
    ) {
      continue;
    }

    accounts.push({
      userId: result.userId,
      accountId: result.accountId,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
    });
  }

  return accounts;
};

export const refreshGoogleTokenIfNeeded = async (
  googleAccount: GoogleAccount,
): Promise<string> => {
  const { accessToken, refreshToken, accessTokenExpiresAt, accountId } = googleAccount;

  if (accessTokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    return accessToken;
  }

  childLog.info({ accountId }, "refreshing google token");

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    childLog.error({ status: response.status, error: errorText }, "token refresh failed");
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const body = await response.json();
  const tokenData = googleTokenResponseSchema.assert(body);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await database
    .update(account)
    .set({
      accessToken: tokenData.access_token,
      accessTokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(account.accountId, accountId));

  childLog.debug({ accountId }, "token refreshed");
  return tokenData.access_token;
};

export const getUserEvents = async (userId: string): Promise<SyncableEvent[]> => {
  const results = await database
    .select({
      id: eventStatesTable.id,
      startTime: eventStatesTable.startTime,
      endTime: eventStatesTable.endTime,
      sourceId: eventStatesTable.sourceId,
      sourceName: remoteICalSourcesTable.name,
    })
    .from(eventStatesTable)
    .innerJoin(
      remoteICalSourcesTable,
      eq(eventStatesTable.sourceId, remoteICalSourcesTable.id),
    )
    .where(eq(remoteICalSourcesTable.userId, userId));

  return results.map(({ id, startTime, endTime, sourceId, sourceName }) => ({
    id,
    startTime,
    endTime,
    sourceId,
    sourceName,
    summary: sourceName,
  }));
};

export interface SyncOutDiff {
  toAdd: SyncableEvent[];
  toRemove: string[];
}

export const diffSyncOutEvents = (
  userId: string,
  localEvents: SyncableEvent[],
  remoteEvents: GoogleEvent[],
): SyncOutDiff => {
  const remoteUids = new Set<string>();
  for (const event of remoteEvents) {
    if (event.iCalUID) {
      remoteUids.add(event.iCalUID);
    }
  }

  const localUidToEvent = new Map<string, SyncableEvent>();
  for (const event of localEvents) {
    const uid = generateEventUid(userId, event);
    localUidToEvent.set(uid, event);
  }

  const toAdd: SyncableEvent[] = [];
  const toRemove: string[] = [];

  for (const [uid, event] of localUidToEvent) {
    if (!remoteUids.has(uid)) {
      toAdd.push(event);
    }
  }

  for (const uid of remoteUids) {
    if (!localUidToEvent.has(uid)) {
      toRemove.push(uid);
    }
  }

  return { toAdd, toRemove };
};

export const syncGoogleAccount = async (googleAccount: GoogleAccount) => {
  const accessToken = await refreshGoogleTokenIfNeeded(googleAccount);

  const provider = new GoogleCalendarProvider({
    userId: googleAccount.userId,
    accessToken,
    calendarId: "primary",
  });

  const localEvents = await getUserEvents(googleAccount.userId);
  const remoteEvents = await provider.listKeeperEvents();

  const { toAdd, toRemove } = diffSyncOutEvents(
    googleAccount.userId,
    localEvents,
    remoteEvents,
  );

  if (toAdd.length === 0 && toRemove.length === 0) {
    childLog.debug({ userId: googleAccount.userId }, "google calendar in sync");
    return { added: 0, removed: 0 };
  }

  if (toAdd.length > 0) {
    await provider.pushEvents(toAdd);
  }

  if (toRemove.length > 0) {
    await provider.deleteEvents(toRemove);
  }

  childLog.info(
    { userId: googleAccount.userId, added: toAdd.length, removed: toRemove.length },
    "google calendar sync complete",
  );

  return { added: toAdd.length, removed: toRemove.length };
};
