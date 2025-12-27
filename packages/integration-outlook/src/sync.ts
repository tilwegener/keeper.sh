import { database } from "@keeper.sh/database";
import {
  remoteICalSourcesTable,
  eventStatesTable,
  userSubscriptionsTable,
  calendarDestinationsTable,
  oauthCredentialsTable,
} from "@keeper.sh/database/schema";
import { and, asc, eq, gte } from "drizzle-orm";
import type { Plan } from "@keeper.sh/premium";
import type { SyncableEvent } from "@keeper.sh/integrations";

export interface OutlookAccount {
  destinationId: string;
  userId: string;
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
}

export const getOutlookAccountsByPlan = async (
  targetPlan: Plan,
): Promise<OutlookAccount[]> => {
  const results = await database
    .select({
      destinationId: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      accountId: calendarDestinationsTable.accountId,
      accessToken: oauthCredentialsTable.accessToken,
      refreshToken: oauthCredentialsTable.refreshToken,
      accessTokenExpiresAt: oauthCredentialsTable.expiresAt,
      plan: userSubscriptionsTable.plan,
    })
    .from(calendarDestinationsTable)
    .innerJoin(
      oauthCredentialsTable,
      eq(calendarDestinationsTable.oauthCredentialId, oauthCredentialsTable.id),
    )
    .leftJoin(
      userSubscriptionsTable,
      eq(calendarDestinationsTable.userId, userSubscriptionsTable.userId),
    )
    .where(eq(calendarDestinationsTable.provider, "outlook"));

  const accounts: OutlookAccount[] = [];

  for (const result of results) {
    const { plan, accessToken, refreshToken, accessTokenExpiresAt } = result;
    const userPlan = plan ?? "free";

    if (userPlan !== targetPlan) {
      continue;
    }

    accounts.push({
      destinationId: result.destinationId,
      userId: result.userId,
      accountId: result.accountId,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
    });
  }

  return accounts;
};

export const getOutlookAccountsForUser = async (
  userId: string,
): Promise<OutlookAccount[]> => {
  const results = await database
    .select({
      destinationId: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      accountId: calendarDestinationsTable.accountId,
      accessToken: oauthCredentialsTable.accessToken,
      refreshToken: oauthCredentialsTable.refreshToken,
      accessTokenExpiresAt: oauthCredentialsTable.expiresAt,
    })
    .from(calendarDestinationsTable)
    .innerJoin(
      oauthCredentialsTable,
      eq(calendarDestinationsTable.oauthCredentialId, oauthCredentialsTable.id),
    )
    .where(
      and(
        eq(calendarDestinationsTable.provider, "outlook"),
        eq(calendarDestinationsTable.userId, userId),
      ),
    );

  return results.map((result) => ({
    destinationId: result.destinationId,
    userId: result.userId,
    accountId: result.accountId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt,
  }));
};

export const getUserEvents = async (userId: string): Promise<SyncableEvent[]> => {
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

  return results.map(({ id, startTime, endTime, sourceId, sourceName, sourceUrl }) => ({
    id,
    startTime,
    endTime,
    sourceId,
    sourceName,
    sourceUrl,
    summary: sourceName ?? "Busy",
  }));
};
