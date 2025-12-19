import { Webhooks } from "@polar-sh/nextjs";
import { log } from "@keeper.sh/log";
import { database } from "@keeper.sh/database";
import { userSubscriptionsTable } from "@keeper.sh/database/schema";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

async function upsertSubscription(
  userId: string,
  plan: "free" | "pro",
  polarSubscriptionId: string,
) {
  await database
    .insert(userSubscriptionsTable)
    .values({
      userId,
      plan,
      polarSubscriptionId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSubscriptionsTable.userId,
      set: {
        plan,
        polarSubscriptionId,
        updatedAt: new Date(),
      },
    });
}

export const POST = POLAR_WEBHOOK_SECRET
  ? Webhooks({
      webhookSecret: POLAR_WEBHOOK_SECRET,
      onPayload: async (payload) => {
        log.info("polar webhook event '%s' received", payload.type);
      },
      onSubscriptionCreated: async (payload) => {
        const userId = payload.data.customer.externalId;
        if (!userId) {
          log.warn("subscription created without external customer ID");
          return;
        }

        await upsertSubscription(userId, "pro", payload.data.id);
        log.info("subscription '%s' created for user '%s'", payload.data.id, userId);
      },
      onSubscriptionUpdated: async (payload) => {
        const userId = payload.data.customer.externalId;
        if (!userId) {
          log.warn("subscription updated without external customer ID");
          return;
        }

        const isActive = payload.data.status === "active";
        await upsertSubscription(userId, isActive ? "pro" : "free", payload.data.id);
        log.info("subscription '%s' updated for user '%s' (active: %s)", payload.data.id, userId, isActive);
      },
      onSubscriptionCanceled: async (payload) => {
        const userId = payload.data.customer.externalId;
        if (!userId) {
          log.warn("subscription canceled without external customer ID");
          return;
        }

        await upsertSubscription(userId, "free", payload.data.id);
        log.info("subscription '%s' canceled for user '%s'", payload.data.id, userId);
      },
    })
  : undefined;
