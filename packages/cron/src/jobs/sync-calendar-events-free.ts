import type { CronOptions } from "cronbake";
import { FREE_SYNC_CRON } from "@keeper.sh/premium";
import { log } from "@keeper.sh/log";
import { syncSource, getSourcesByPlan } from "../lib/sync-utils";

export default {
  name: import.meta.file,
  cron: FREE_SYNC_CRON,
  immediate: true,
  async callback() {
    const sources = await getSourcesByPlan("free");
    log.debug("syncing %s free sources", sources.length);

    const syncs = sources.map((source) => syncSource(source));
    await Promise.allSettled(syncs);
  },
} satisfies CronOptions;
