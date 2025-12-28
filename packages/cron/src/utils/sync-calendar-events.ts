import type { CronOptions } from "cronbake";
import type { Plan } from "@keeper.sh/premium";
import { log } from "@keeper.sh/log";
import { syncDestinationsForUser } from "@keeper.sh/integrations";
import { fetchAndSyncSource, type Source } from "@keeper.sh/calendar";
import {
  getSourcesByPlan,
  getUsersWithDestinationsByPlan,
} from "./get-sources";
import { database, destinationProviders, syncCoordinator } from "../context";

const syncUserSources = async (userId: string, sources: Source[]) => {
  await Promise.allSettled(
    sources.map((source) => fetchAndSyncSource(database, source)),
  );
  await syncDestinationsForUser(userId, destinationProviders, syncCoordinator);
};

export const createSyncJob = (plan: Plan, cron: string): CronOptions => ({
  name: `sync-calendar-events-${plan}`,
  cron,
  immediate: process.env.NODE_ENV !== "production",
  async callback() {
    const sources = await getSourcesByPlan(plan);
    const usersWithDestinations = await getUsersWithDestinationsByPlan(plan);
    log.debug(
      "syncing %s %s sources for %s users with destinations",
      sources.length,
      plan,
      usersWithDestinations.length,
    );

    const sourcesByUser = new Map<string, Source[]>();
    for (const source of sources) {
      const userSources = sourcesByUser.get(source.userId) ?? [];
      userSources.push(source);
      sourcesByUser.set(source.userId, userSources);
    }

    for (const userId of usersWithDestinations) {
      if (!sourcesByUser.has(userId)) {
        sourcesByUser.set(userId, []);
      }
    }

    const userSyncs = Array.from(sourcesByUser.entries()).map(
      ([userId, userSources]) => syncUserSources(userId, userSources),
    );

    await Promise.allSettled(userSyncs);
  },
});
