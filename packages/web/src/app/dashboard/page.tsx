"use client";

import { Calendar } from "@/components/calendar";
import { useEvents } from "@/hooks/use-events";

export default function DashboardPage() {
  const { data: events, isLoading } = useEvents();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-0">
      <Calendar events={events ?? []} />
    </div>
  );
}
