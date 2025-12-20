import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

const DAYS_PER_PAGE = 7;

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

const fetchEvents = async (url: string): Promise<CalendarEvent[]> => {
  const response = await fetch(url);
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

interface UseEventsOptions {
  startDate?: Date;
}

export function useEvents({ startDate }: UseEventsOptions = {}) {
  const baseDate = useMemo(() => {
    const date = startDate ?? new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, [startDate]);

  const getKey = (pageIndex: number) => {
    const from = new Date(baseDate);
    from.setDate(from.getDate() + pageIndex * DAYS_PER_PAGE);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setDate(to.getDate() + DAYS_PER_PAGE - 1);
    to.setHours(23, 59, 59, 999);

    const url = new URL("/api/events", window.location.origin);
    url.searchParams.set("from", from.toISOString());
    url.searchParams.set("to", to.toISOString());

    return url.toString();
  };

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    fetchEvents,
    { suspense: true },
  );

  const allEvents = data?.flat() ?? [];
  const events = Array.from(
    new Map(allEvents.map((event) => [event.id, event])).values(),
  );
  const isLoadingMore =
    isLoading || (size > 0 && data !== undefined && data[size - 1] === undefined);

  return {
    events,
    isLoading,
    isLoadingMore,
    isValidating,
    loadMore: () => setSize(size + 1),
    size,
  };
}
