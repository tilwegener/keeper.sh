import { text, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().notNull().primaryKey().defaultRandom(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const calendarSnapshotsTable = pgTable("calendar_snapshots", {
  id: uuid().notNull().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  ical: text(),
});

export const remoteICalSourcesTable = pgTable("remote_ical_sources", {
  id: uuid().notNull().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  url: text().notNull(),
});

export const calendarsTable = pgTable("calendars", {
  id: uuid().notNull().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  remoteUrl: text().notNull(),
  name: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const eventStatesTable = pgTable("event_states", {
  id: uuid().notNull().primaryKey().defaultRandom(),
  calendarId: uuid()
    .notNull()
    .references(() => calendarsTable.id),
  startTime: timestamp().notNull(),
  endTime: timestamp().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});
