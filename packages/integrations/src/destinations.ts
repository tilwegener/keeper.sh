import type { SyncResult } from "./types";
import { log } from "@keeper.sh/log";
import {
  startSync,
  endSync,
  isSyncCurrent,
  type SyncContext,
} from "./sync-coordinator";

export interface DestinationProvider {
  syncForUser(userId: string, context: SyncContext): Promise<SyncResult | null>;
}

export async function syncDestinationsForUser(
  userId: string,
  providers: DestinationProvider[],
): Promise<void> {
  const context = await startSync(userId);

  try {
    const results = await Promise.allSettled(
      providers.map((provider) => provider.syncForUser(userId, context)),
    );

    const isCurrent = await isSyncCurrent(context);

    for (const result of results) {
      if (result.status === "rejected" && isCurrent) {
        log.error(
          { error: result.reason },
          "destination sync failed for user '%s'",
          userId,
        );
      }
    }
  } finally {
    await endSync(context);
  }
}
