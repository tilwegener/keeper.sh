import { randomUUID, randomPastDate, randomElement } from "../utils/random";

const CALENDAR_NAMES = [
  "Work",
  "Personal",
  "Family",
  "Meetings",
  "Holidays",
  "Birthdays",
  "Travel",
  "Projects",
  "Deadlines",
  "Reminders",
];

export type GeneratedCalendar = {
  id: string;
  userId: string;
  remoteUrl: string;
  name: string;
  createdAt: Date;
};

export const generateCalendar = (
  baseUrl: string,
  userId: string,
  snapshotId: string,
): GeneratedCalendar => ({
  id: randomUUID(),
  userId,
  remoteUrl: new URL(`/snapshots/${snapshotId}.ics`, baseUrl).href,
  name: randomElement(CALENDAR_NAMES),
  createdAt: randomPastDate(60),
});

export const generateCalendars = (
  baseUrl: string,
  userId: string,
  snapshotIds: string[],
): GeneratedCalendar[] =>
  snapshotIds.map((snapshotId) =>
    generateCalendar(baseUrl, userId, snapshotId),
  );
