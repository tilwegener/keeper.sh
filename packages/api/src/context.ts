import env from "@keeper.sh/env/api";
import { createDatabase } from "@keeper.sh/database";
import { syncStatusTable } from "@keeper.sh/database/schema";
import { createRedis } from "@keeper.sh/redis";
import { createAuth } from "@keeper.sh/auth";
import { createBroadcastService } from "@keeper.sh/broadcast";
import { createPremiumService } from "@keeper.sh/premium";
import {
  createOAuthProviders,
  createDestinationProviders,
} from "@keeper.sh/destination-providers";
import {
  createSyncCoordinator,
  type DestinationSyncResult,
} from "@keeper.sh/integrations";
import { eq } from "drizzle-orm";

export const database = createDatabase(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL);

export const { auth } = createAuth({
  database,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  webBaseUrl: env.WEB_BASE_URL,
  commercialMode: env.COMMERCIAL_MODE ?? false,
  polarAccessToken: env.POLAR_ACCESS_TOKEN,
  polarMode: env.POLAR_MODE,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  resendApiKey: env.RESEND_API_KEY,
  passkeyRpId: env.PASSKEY_RP_ID,
  passkeyRpName: env.PASSKEY_RP_NAME,
  passkeyOrigin: env.PASSKEY_ORIGIN,
});

export const broadcastService = createBroadcastService({ redis });

export const premiumService = createPremiumService({
  database,
  commercialMode: env.COMMERCIAL_MODE ?? false,
});

export const oauthProviders = createOAuthProviders({
  google:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }
      : undefined,
  microsoft:
    env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
      ? {
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
        }
      : undefined,
});

export const destinationProviders = createDestinationProviders({
  database,
  oauthProviders,
  encryptionKey: env.ENCRYPTION_KEY ?? "",
});

const onDestinationSync = async (result: DestinationSyncResult) => {
  await database
    .update(syncStatusTable)
    .set({
      localEventCount: result.localEventCount,
      remoteEventCount: result.remoteEventCount,
      lastSyncedAt: new Date(),
    })
    .where(eq(syncStatusTable.destinationId, result.destinationId));

  broadcastService.emit(result.userId, "sync:status", {
    destinationId: result.destinationId,
    status: "idle",
    localEventCount: result.localEventCount,
    remoteEventCount: result.remoteEventCount,
    inSync: result.localEventCount === result.remoteEventCount,
    lastSyncedAt: new Date().toISOString(),
  });
};

export const syncCoordinator = createSyncCoordinator({ redis, onDestinationSync });

export const baseUrl = env.BETTER_AUTH_URL;
export const encryptionKey = env.ENCRYPTION_KEY;
