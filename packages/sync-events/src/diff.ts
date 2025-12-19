import type { IcsCalendar, IcsEvent, IcsDuration } from "ts-ics";
import type { EventTimeSlot, StoredEventTimeSlot, EventDiff } from "./types";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

const durationToMs = (duration: IcsDuration): number => {
  const { weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = duration;
  return (
    weeks * MS_PER_WEEK +
    days * MS_PER_DAY +
    hours * MS_PER_HOUR +
    minutes * MS_PER_MINUTE +
    seconds * MS_PER_SECOND
  );
};

const getEventEndTime = (event: IcsEvent, startTime: Date): Date => {
  if ("end" in event && event.end) {
    return event.end.date;
  }

  if ("duration" in event && event.duration) {
    return new Date(startTime.getTime() + durationToMs(event.duration));
  }

  return startTime;
};

export const parseIcsEvents = (calendar: IcsCalendar): EventTimeSlot[] => {
  return (calendar.events ?? []).map((event) => {
    const startTime = event.start.date;
    return {
      startTime,
      endTime: getEventEndTime(event, startTime),
    };
  });
};

const timeSlotKey = (slot: EventTimeSlot): string =>
  `${slot.startTime.getTime()}:${slot.endTime.getTime()}`;

export const diffEvents = (
  remote: EventTimeSlot[],
  stored: StoredEventTimeSlot[],
): EventDiff => {
  const remoteCounts = new Map<string, number>();
  for (const event of remote) {
    const key = timeSlotKey(event);
    remoteCounts.set(key, (remoteCounts.get(key) ?? 0) + 1);
  }

  const storedCounts = new Map<string, number>();
  const storedByKey = new Map<string, StoredEventTimeSlot[]>();
  for (const event of stored) {
    const key = timeSlotKey(event);
    storedCounts.set(key, (storedCounts.get(key) ?? 0) + 1);
    const existing = storedByKey.get(key) ?? [];
    existing.push(event);
    storedByKey.set(key, existing);
  }

  const toAdd: EventTimeSlot[] = [];
  const toRemove: StoredEventTimeSlot[] = [];

  for (const event of remote) {
    const key = timeSlotKey(event);
    const remoteCount = remoteCounts.get(key) ?? 0;
    const storedCount = storedCounts.get(key) ?? 0;

    if (remoteCount > storedCount) {
      const diff = remoteCount - storedCount;
      for (let i = 0; i < diff; i++) {
        toAdd.push(event);
      }
      remoteCounts.set(key, storedCount);
    }
  }

  for (const [key, events] of storedByKey) {
    const remoteCount = remoteCounts.get(key) ?? 0;
    const storedCount = storedCounts.get(key) ?? 0;

    if (storedCount > remoteCount) {
      const diff = storedCount - remoteCount;
      for (let i = 0; i < diff; i++) {
        const event = events[i];
        if (event) toRemove.push(event);
      }
    }
  }

  return { toAdd, toRemove };
};
