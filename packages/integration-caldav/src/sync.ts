import { database } from "@keeper.sh/database";
import {
  remoteICalSourcesTable,
  eventStatesTable,
  calendarDestinationsTable,
  caldavCredentialsTable,
} from "@keeper.sh/database/schema";
import { decryptPassword } from "@keeper.sh/encryption";
import env from "@keeper.sh/env/auth";
import { and, asc, eq, gte, like, or } from "drizzle-orm";
import type { SyncableEvent } from "@keeper.sh/integrations";

export interface CalDAVAccount {
  destinationId: string;
  userId: string;
  provider: string;
  accountId: string;
  email: string | null;
  serverUrl: string;
  calendarUrl: string;
  username: string;
  encryptedPassword: string;
}

export const getCalDAVAccountsForUser = async (
  userId: string,
  providerFilter?: string,
): Promise<CalDAVAccount[]> => {
  const providerCondition = providerFilter
    ? eq(calendarDestinationsTable.provider, providerFilter)
    : or(
        eq(calendarDestinationsTable.provider, "caldav"),
        eq(calendarDestinationsTable.provider, "fastmail"),
        eq(calendarDestinationsTable.provider, "icloud"),
      );

  const results = await database
    .select({
      destinationId: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      provider: calendarDestinationsTable.provider,
      accountId: calendarDestinationsTable.accountId,
      email: calendarDestinationsTable.email,
      serverUrl: caldavCredentialsTable.serverUrl,
      calendarUrl: caldavCredentialsTable.calendarUrl,
      username: caldavCredentialsTable.username,
      encryptedPassword: caldavCredentialsTable.encryptedPassword,
    })
    .from(calendarDestinationsTable)
    .innerJoin(
      caldavCredentialsTable,
      eq(calendarDestinationsTable.caldavCredentialId, caldavCredentialsTable.id),
    )
    .where(
      and(providerCondition, eq(calendarDestinationsTable.userId, userId)),
    );

  return results.map((r) => ({
    destinationId: r.destinationId,
    userId: r.userId,
    provider: r.provider,
    accountId: r.accountId,
    email: r.email,
    serverUrl: r.serverUrl,
    calendarUrl: r.calendarUrl,
    username: r.username,
    encryptedPassword: r.encryptedPassword,
  }));
};

export const getCalDAVAccountsByProvider = async (
  provider: string,
): Promise<CalDAVAccount[]> => {
  const results = await database
    .select({
      destinationId: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      provider: calendarDestinationsTable.provider,
      accountId: calendarDestinationsTable.accountId,
      email: calendarDestinationsTable.email,
      serverUrl: caldavCredentialsTable.serverUrl,
      calendarUrl: caldavCredentialsTable.calendarUrl,
      username: caldavCredentialsTable.username,
      encryptedPassword: caldavCredentialsTable.encryptedPassword,
    })
    .from(calendarDestinationsTable)
    .innerJoin(
      caldavCredentialsTable,
      eq(calendarDestinationsTable.caldavCredentialId, caldavCredentialsTable.id),
    )
    .where(eq(calendarDestinationsTable.provider, provider));

  return results.map((r) => ({
    destinationId: r.destinationId,
    userId: r.userId,
    provider: r.provider,
    accountId: r.accountId,
    email: r.email,
    serverUrl: r.serverUrl,
    calendarUrl: r.calendarUrl,
    username: r.username,
    encryptedPassword: r.encryptedPassword,
  }));
};

export const getDecryptedPassword = (encryptedPassword: string): string => {
  return decryptPassword(encryptedPassword, env.ENCRYPTION_KEY!);
};

export const getUserEvents = async (
  userId: string,
): Promise<SyncableEvent[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await database
    .select({
      id: eventStatesTable.id,
      startTime: eventStatesTable.startTime,
      endTime: eventStatesTable.endTime,
      sourceId: eventStatesTable.sourceId,
      sourceName: remoteICalSourcesTable.name,
      sourceUrl: remoteICalSourcesTable.url,
    })
    .from(eventStatesTable)
    .innerJoin(
      remoteICalSourcesTable,
      eq(eventStatesTable.sourceId, remoteICalSourcesTable.id),
    )
    .where(
      and(
        eq(remoteICalSourcesTable.userId, userId),
        gte(eventStatesTable.startTime, today),
      ),
    )
    .orderBy(asc(eventStatesTable.startTime));

  return results.map(
    ({ id, startTime, endTime, sourceId, sourceName, sourceUrl }) => ({
      id,
      startTime,
      endTime,
      sourceId,
      sourceName,
      sourceUrl,
      summary: sourceName ?? "Busy",
    }),
  );
};
