import type { CronOptions } from "cronbake";
import { polarClient } from "@keeper.sh/auth";
import { database } from "@keeper.sh/database";
import { userSubscriptionsTable } from "@keeper.sh/database/schema";
import { user } from "@keeper.sh/database/auth-schema";
import { log } from "@keeper.sh/log";

class SubscriptionReconcileError extends Error {
  constructor(
    public userId: string,
    cause: unknown,
  ) {
    super(`Failed to reconcile subscription for user ${userId}`);
    this.cause = cause;
  }
}

async function reconcileUserSubscription(userId: string) {
  if (!polarClient) return;

  try {
    const subscriptions = await polarClient.subscriptions.list({
      externalCustomerId: userId,
      active: true,
    });

    const hasActiveSubscription = subscriptions.result.items.length > 0;
    const plan = hasActiveSubscription ? "pro" : "free";

    const [polarSubscription] = subscriptions.result.items;
    const polarSubscriptionId = polarSubscription?.id ?? null;

    await database
      .insert(userSubscriptionsTable)
      .values({
        userId,
        plan,
        polarSubscriptionId,
      })
      .onConflictDoUpdate({
        target: userSubscriptionsTable.userId,
        set: {
          plan,
          polarSubscriptionId,
        },
      });

    log.debug("reconciled user '%s' to plan '%s'", userId, plan);
  } catch (error) {
    const reconcileError = new SubscriptionReconcileError(userId, error);
    log.error(
      { error: reconcileError, userId },
      "failed to reconcile subscription",
    );
  }
}

export default {
  name: import.meta.file,
  cron: "0 0 * * * *",
  immediate: true,
  async callback() {
    if (!polarClient) {
      log.debug("polar client not configured, skipping reconciliation");
      return;
    }

    const users = await database.select({ id: user.id }).from(user);
    log.info("reconciling subscriptions for %s users", users.length);

    const reconciliations = users.map((user) =>
      reconcileUserSubscription(user.id),
    );

    await Promise.allSettled(reconciliations);

    log.info("subscription reconciliation complete");
  },
} satisfies CronOptions;
