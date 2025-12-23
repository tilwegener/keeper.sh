import type { CronOptions } from "cronbake";
import { log } from "@keeper.sh/log";
import {
  getGoogleAccountsByPlan,
  syncGoogleAccount,
} from "@keeper.sh/integration-google-calendar";

export default {
  name: import.meta.file,
  cron: "@every_5_minutes",
  immediate: true,
  delay: "2m",
  async callback() {
    const accounts = await getGoogleAccountsByPlan("pro");
    log.debug("syncing out to %s pro google accounts", accounts.length);

    const results = await Promise.allSettled(accounts.map(syncGoogleAccount));

    for (const result of results) {
      if (result.status === "rejected") {
        log.error({ error: result.reason }, "failed to sync google calendar");
      }
    }
  },
} satisfies CronOptions;
