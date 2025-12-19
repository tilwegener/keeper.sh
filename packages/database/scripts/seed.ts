import env from "@keeper.sh/env/database/seed";
import { database } from "@keeper.sh/database";
import {
  usersTable,
  calendarsTable,
  calendarSnapshotsTable,
  remoteICalSourcesTable,
  eventStatesTable,
} from "@keeper.sh/database/schema";
import {
  generateUsers,
  generateCalendars,
  generateSnapshots,
  generateRemoteSources,
  generateEventStates,
  randomInt,
} from "@keeper.sh/synthetic-data";
import { log } from "@keeper.sh/log";

const seed = async () => {
  log.info("seeding database");

  const users = generateUsers(5);
  await database.insert(usersTable).values(users);
  log.debug("seeded %s users", users.length);

  for (const user of users) {
    const snapshots = generateSnapshots(user.id, randomInt(3, 5));
    await database.insert(calendarSnapshotsTable).values(snapshots);
    log.debug("seeded %s snapshots for user '%s'", snapshots.length, user.id);

    const snapshotIds = snapshots.map((s) => s.id);
    const calendars = generateCalendars(env.API_BASE_URL, user.id, snapshotIds);
    await database.insert(calendarsTable).values(calendars);
    log.debug("seeded %s calendars for user '%s'", calendars.length, user.id);

    for (const calendar of calendars) {
      const eventStates = generateEventStates(calendar.id, randomInt(5, 10));
      await database.insert(eventStatesTable).values(eventStates);
      log.debug(
        "seeded %s event states for calendar '%s'",
        eventStates.length,
        calendar.id,
      );
    }

    const remoteSourceIds = snapshotIds.slice(0, randomInt(1, 2));
    const remoteSources = generateRemoteSources(
      env.API_BASE_URL,
      user.id,
      remoteSourceIds,
    );
    await database.insert(remoteICalSourcesTable).values(remoteSources);
    log.debug(
      "seeded %s remote sources for user '%s'",
      remoteSources.length,
      user.id,
    );
  }

  log.info("seeding complete");
};

await seed();
