import { text, pgTable, timestamp } from "drizzle-orm/pg-core";

export const calendarSnapshots = pgTable("calendar_snapshots", {
  createdAt: timestamp().notNull().defaultNow(),
  ical: text(),
});
