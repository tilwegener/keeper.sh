import useSWR from "swr";

export interface CalendarSource {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

async function fetchSources(): Promise<CalendarSource[]> {
  const response = await fetch("/api/ics");
  if (!response.ok) {
    throw new Error("Failed to fetch sources");
  }
  return response.json();
}

export function useSources() {
  return useSWR("calendar-sources", fetchSources);
}
