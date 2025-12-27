import { log } from "@keeper.sh/log";
import { pullRemoteCalendar } from "./pull-remote-calendar";
import { createSnapshot } from "./create-snapshot";
import { syncSourceFromSnapshot, type Source } from "./sync-source-from-snapshot";

export class SourceSyncError extends Error {
  constructor(
    public sourceId: string,
    cause: unknown,
  ) {
    super(`Failed to sync source ${sourceId}`);
    this.cause = cause;
  }
}

export async function fetchAndSyncSource(source: Source) {
  log.trace("fetchAndSyncSource for source '%s' started", source.id);

  try {
    const { ical } = await pullRemoteCalendar("ical", source.url);
    await createSnapshot(source.id, ical);
    await syncSourceFromSnapshot(source);
    log.trace("fetchAndSyncSource for source '%s' complete", source.id);
  } catch (error) {
    const syncError = new SourceSyncError(source.id, error);
    log.error({ error: syncError, sourceId: source.id }, "failed to fetch and sync source");
    throw syncError;
  }
}
