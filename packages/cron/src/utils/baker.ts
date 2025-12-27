import { log } from "@keeper.sh/log";
import { Baker } from "cronbake";

export const baker = Baker.create({
  onError(error, jobName) {
    log.error({ error, jobName }, "error in job");
  },
});
