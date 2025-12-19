import type { CronOptions } from "cronbake";
import { log } from "@keeper.sh/log";
import { fetchAndSyncSource, getSourcesByPlan } from "../lib/sync-utils";

export default {
  name: import.meta.file,
  cron: "@every_5_minutes",
  immediate: true,
  delay: "1m",
  async callback() {
    const sources = await getSourcesByPlan("pro");
    log.debug("syncing %s pro sources", sources.length);

    const syncs = sources.map((source) => fetchAndSyncSource(source));
    await Promise.allSettled(syncs);
  },
} satisfies CronOptions;
