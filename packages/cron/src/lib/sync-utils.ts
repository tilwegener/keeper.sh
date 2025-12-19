import { database } from "@keeper.sh/database";
import {
  remoteICalSourcesTable,
  eventStatesTable,
  calendarSnapshotsTable,
} from "@keeper.sh/database/schema";
import { parseIcsEvents, diffEvents } from "@keeper.sh/sync-events";
import { getUserPlan, type Plan } from "@keeper.sh/premium";
import { convertIcsCalendar } from "ts-ics";
import { log } from "@keeper.sh/log";
import { eq, inArray, desc } from "drizzle-orm";

export type Source = typeof remoteICalSourcesTable.$inferSelect;

const getLatestSnapshot = async (sourceId: string) => {
  const [snapshot] = await database
    .select({ ical: calendarSnapshotsTable.ical })
    .from(calendarSnapshotsTable)
    .where(eq(calendarSnapshotsTable.sourceId, sourceId))
    .orderBy(desc(calendarSnapshotsTable.createdAt))
    .limit(1);

  if (!snapshot?.ical) return null;
  return convertIcsCalendar(undefined, snapshot.ical);
};

const getStoredEvents = async (sourceId: string) => {
  return database
    .select({
      id: eventStatesTable.id,
      startTime: eventStatesTable.startTime,
      endTime: eventStatesTable.endTime,
    })
    .from(eventStatesTable)
    .where(eq(eventStatesTable.sourceId, sourceId));
};

const removeEvents = async (sourceId: string, eventIds: string[]) => {
  await database
    .delete(eventStatesTable)
    .where(inArray(eventStatesTable.id, eventIds));

  log.debug("removed %s events from source '%s'", eventIds.length, sourceId);
};

const addEvents = async (
  sourceId: string,
  events: { startTime: Date; endTime: Date }[],
) => {
  const rows = events.map((event) => ({
    sourceId,
    startTime: event.startTime,
    endTime: event.endTime,
  }));

  await database.insert(eventStatesTable).values(rows);
  log.debug("added %s events to source '%s'", events.length, sourceId);
};

export const syncSource = async (source: Source) => {
  log.debug("syncing source '%s'", source.id);

  try {
    const icsCalendar = await getLatestSnapshot(source.id);
    if (!icsCalendar) {
      log.debug("no snapshot found for source '%s'", source.id);
      return;
    }

    const remoteEvents = parseIcsEvents(icsCalendar);
    const storedEvents = await getStoredEvents(source.id);
    const { toAdd, toRemove } = diffEvents(remoteEvents, storedEvents);

    if (toRemove.length > 0) {
      const eventIds = toRemove.map((event) => event.id);
      await removeEvents(source.id, eventIds);
    }

    if (toAdd.length > 0) {
      await addEvents(source.id, toAdd);
    }

    if (toAdd.length === 0 && toRemove.length === 0) {
      log.debug("source '%s' is in sync", source.id);
    }
  } catch (error) {
    log.error(error, "failed to sync source '%s'", source.id);
  }
};

export async function getSourcesByPlan(targetPlan: Plan): Promise<Source[]> {
  const sources = await database.select().from(remoteICalSourcesTable);

  const userPlans = new Map<string, Plan>();

  for (const source of sources) {
    if (!userPlans.has(source.userId)) {
      userPlans.set(source.userId, await getUserPlan(source.userId));
    }
  }

  return sources.filter((source) => userPlans.get(source.userId) === targetPlan);
}
