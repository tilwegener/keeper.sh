export type EventTimeSlot = {
  startTime: Date;
  endTime: Date;
};

export type StoredEventTimeSlot = EventTimeSlot & {
  id: string;
};

export type EventDiff = {
  toAdd: EventTimeSlot[];
  toRemove: StoredEventTimeSlot[];
};
