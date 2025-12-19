import { log } from "@keeper.sh/log";
import type { CronOptions } from "cronbake";

/**
 * Applies side-effects when jobs are run
 */
export const injectJobs = (configurations: CronOptions[]) => {
  return configurations.map(({ callback, ...job }) => ({
    ...job,
    callback: new Proxy(callback, {
      apply: (...parameters) => {
        log.info({ "job.name": job.name }, "running cron job");
        return Reflect.apply(...parameters);
      },
    }),
  }));
};
