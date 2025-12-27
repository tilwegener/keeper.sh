import { database } from "@keeper.sh/database";
import {
  calendarDestinationsTable,
  oauthCredentialsTable,
  caldavCredentialsTable,
} from "@keeper.sh/database/schema";
import { eq, and } from "drizzle-orm";
import {
  getOAuthProvider,
  isOAuthProvider,
  validateOAuthState,
  type AuthorizationUrlOptions,
} from "@keeper.sh/destination-providers";

export { isOAuthProvider };

export const getAuthorizationUrl = (
  provider: string,
  userId: string,
  options: AuthorizationUrlOptions,
): string => {
  const oauthProvider = getOAuthProvider(provider);
  if (!oauthProvider) {
    throw new Error(`OAuth provider not found: ${provider}`);
  }
  return oauthProvider.getAuthorizationUrl(userId, options);
};

export const exchangeCodeForTokens = async (
  provider: string,
  code: string,
  callbackUrl: string,
) => {
  const oauthProvider = getOAuthProvider(provider);
  if (!oauthProvider) {
    throw new Error(`OAuth provider not found: ${provider}`);
  }
  return oauthProvider.exchangeCodeForTokens(code, callbackUrl);
};

export const fetchUserInfo = async (provider: string, accessToken: string) => {
  const oauthProvider = getOAuthProvider(provider);
  if (!oauthProvider) {
    throw new Error(`OAuth provider not found: ${provider}`);
  }
  return oauthProvider.fetchUserInfo(accessToken);
};

export const validateState = (state: string): string | null => {
  return validateOAuthState(state);
};

interface CalendarDestination {
  id: string;
  provider: string;
  email: string | null;
}

export const saveCalendarDestination = async (
  userId: string,
  provider: string,
  accountId: string,
  email: string | null,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> => {
  const [existingDestination] = await database
    .select({
      id: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      oauthCredentialId: calendarDestinationsTable.oauthCredentialId,
    })
    .from(calendarDestinationsTable)
    .where(
      and(
        eq(calendarDestinationsTable.provider, provider),
        eq(calendarDestinationsTable.accountId, accountId),
      ),
    )
    .limit(1);

  if (existingDestination && existingDestination.userId !== userId) {
    throw new Error("This account is already linked to another user");
  }

  if (existingDestination?.oauthCredentialId) {
    await database
      .update(oauthCredentialsTable)
      .set({
        accessToken,
        refreshToken,
        expiresAt,
      })
      .where(eq(oauthCredentialsTable.id, existingDestination.oauthCredentialId));

    await database
      .update(calendarDestinationsTable)
      .set({ email })
      .where(eq(calendarDestinationsTable.id, existingDestination.id));
  } else {
    const [credential] = await database
      .insert(oauthCredentialsTable)
      .values({
        accessToken,
        refreshToken,
        expiresAt,
      })
      .returning({ id: oauthCredentialsTable.id });

    if (!credential) {
      throw new Error("Failed to create OAuth credentials");
    }

    await database
      .insert(calendarDestinationsTable)
      .values({
        userId,
        provider,
        accountId,
        email,
        oauthCredentialId: credential.id,
      })
      .onConflictDoUpdate({
        target: [
          calendarDestinationsTable.provider,
          calendarDestinationsTable.accountId,
        ],
        set: {
          email,
          oauthCredentialId: credential.id,
        },
      });
  }
};

export const listCalendarDestinations = async (
  userId: string,
): Promise<CalendarDestination[]> => {
  const destinations = await database
    .select({
      id: calendarDestinationsTable.id,
      provider: calendarDestinationsTable.provider,
      email: calendarDestinationsTable.email,
    })
    .from(calendarDestinationsTable)
    .where(eq(calendarDestinationsTable.userId, userId));

  return destinations;
};

export const deleteCalendarDestination = async (
  userId: string,
  destinationId: string,
): Promise<boolean> => {
  const result = await database
    .delete(calendarDestinationsTable)
    .where(
      and(
        eq(calendarDestinationsTable.userId, userId),
        eq(calendarDestinationsTable.id, destinationId),
      ),
    )
    .returning({ id: calendarDestinationsTable.id });

  return result.length > 0;
};

export const saveCalDAVDestination = async (
  userId: string,
  provider: string,
  accountId: string,
  email: string,
  serverUrl: string,
  calendarUrl: string,
  username: string,
  encryptedPassword: string,
): Promise<void> => {
  const [existingDestination] = await database
    .select({
      id: calendarDestinationsTable.id,
      userId: calendarDestinationsTable.userId,
      caldavCredentialId: calendarDestinationsTable.caldavCredentialId,
    })
    .from(calendarDestinationsTable)
    .where(
      and(
        eq(calendarDestinationsTable.provider, provider),
        eq(calendarDestinationsTable.accountId, accountId),
      ),
    )
    .limit(1);

  if (existingDestination && existingDestination.userId !== userId) {
    throw new Error("This account is already linked to another user");
  }

  if (existingDestination?.caldavCredentialId) {
    await database
      .update(caldavCredentialsTable)
      .set({
        serverUrl,
        calendarUrl,
        username,
        encryptedPassword,
      })
      .where(eq(caldavCredentialsTable.id, existingDestination.caldavCredentialId));

    await database
      .update(calendarDestinationsTable)
      .set({ email })
      .where(eq(calendarDestinationsTable.id, existingDestination.id));
  } else {
    const [credential] = await database
      .insert(caldavCredentialsTable)
      .values({
        serverUrl,
        calendarUrl,
        username,
        encryptedPassword,
      })
      .returning({ id: caldavCredentialsTable.id });

    if (!credential) {
      throw new Error("Failed to create CalDAV credentials");
    }

    await database
      .insert(calendarDestinationsTable)
      .values({
        userId,
        provider,
        accountId,
        email,
        caldavCredentialId: credential.id,
      })
      .onConflictDoUpdate({
        target: [
          calendarDestinationsTable.provider,
          calendarDestinationsTable.accountId,
        ],
        set: {
          email,
          caldavCredentialId: credential.id,
        },
      });
  }
};
