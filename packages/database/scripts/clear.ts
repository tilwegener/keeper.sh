import { database } from "@keeper.sh/database";
import {
  usersTable,
  calendarsTable,
  calendarSnapshotsTable,
  remoteICalSourcesTable,
  eventStatesTable,
} from "@keeper.sh/database/schema";
import { log } from "@keeper.sh/log";
import { getTableName } from "drizzle-orm";
import type { PgTableWithColumns, TableConfig } from "drizzle-orm/pg-core";

type ExtractTableConfig<T> = T extends PgTableWithColumns<infer U> ? U : never;

const makeLogDeletedRecords = <
  TableSignature extends PgTableWithColumns<ExtractTableConfig<TableSignature>>,
>(
  table: TableSignature,
) => {
  return ({ length: count }: unknown[]) => {
    log.debug({ count }, "deleted records from %s", getTableName(table));
  };
};

const clear = async () => {
  log.info("clearing database");

  const logDeleteEventsStates = makeLogDeletedRecords(eventStatesTable);
  const logDeleteCalendars = makeLogDeletedRecords(calendarsTable);
  const logDeleteRemoteICals = makeLogDeletedRecords(remoteICalSourcesTable);
  const logDeleteUsers = makeLogDeletedRecords(usersTable);

  await database
    .delete(eventStatesTable)
    .returning()
    .then(logDeleteEventsStates);

  await database.delete(calendarsTable).returning().then(logDeleteCalendars);

  await database
    .delete(calendarSnapshotsTable)
    .returning()
    .then(logDeleteRemoteICals);

  await database
    .delete(remoteICalSourcesTable)
    .returning()
    .then(logDeleteRemoteICals);

  await database.delete(usersTable).returning().then(logDeleteUsers);

  log.info("database cleared");
};

await clear();
