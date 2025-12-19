import useSWR from "swr";

interface ApiEvent {
  id: string;
  startTime: string;
  endTime: string;
  calendarId: string;
  sourceName: string;
  sourceUrl: string;
}

export interface CalendarEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  calendarId: string;
  sourceName: string;
  sourceUrl: string;
}

const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const response = await fetch("/api/events");
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  const data: ApiEvent[] = await response.json();
  return data.map((event) => ({
    id: event.id,
    startTime: new Date(event.startTime),
    endTime: new Date(event.endTime),
    calendarId: event.calendarId,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
  }));
};

export function useEvents() {
  return useSWR("calendar-events", fetchEvents);
}
