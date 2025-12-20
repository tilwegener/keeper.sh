"use client";

import type { RefCallback } from "react";
import {
  getDaysFromDate,
  isSameDay,
  formatTime,
  formatDayHeading,
  getColorFromUrl,
} from "@/utils/calendar";
import {
  agendaContainer,
  agendaDaySection,
  agendaDayHeading,
  agendaEventList,
  agendaEventItem,
  agendaEventTime,
  agendaEventDot,
  agendaEventSource,
  agendaEmptyDay,
} from "@/styles";
import { TextBody } from "@/components/typography";

const SkeletonBar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const SkeletonEventItem = () => (
  <li className={agendaEventItem()}>
    <SkeletonBar className="w-1.5 h-1.5 rounded-full shrink-0" />
    <SkeletonBar className="h-4 w-64" />
  </li>
);

const SkeletonDaySection = ({ index }: { index: number }) => {
  const eventCount = (index % 3) + 1;
  return (
    <section className={agendaDaySection()}>
      <div className="border-b border-gray-200 pb-2">
        <SkeletonBar className="h-6 w-48" />
      </div>
      <ul className={agendaEventList()}>
        {Array.from({ length: eventCount }).map((_, i) => (
          <SkeletonEventItem key={i} />
        ))}
      </ul>
    </section>
  );
};

export const CalendarSkeleton = ({ days = 7 }: { days?: number }) => (
  <div className={agendaContainer()}>
    {Array.from({ length: days }).map((_, i) => (
      <SkeletonDaySection key={i} index={i} />
    ))}
  </div>
);

export interface CalendarEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  calendarId?: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface CalendarProps {
  events?: CalendarEvent[];
  startDate?: Date;
  daysToShow?: number;
  isLoadingMore?: boolean;
  lastSectionRef?: RefCallback<HTMLElement>;
}

const DayEventList = ({ events }: { events: CalendarEvent[] }) => {
  if (events.length === 0) {
    return <p className={agendaEmptyDay()}>No events</p>;
  }

  return (
    <ul className={agendaEventList()}>
      {events.map((event) => (
        <li key={event.id} className={agendaEventItem()}>
          <span
            className={agendaEventDot({
              color: getColorFromUrl(event.sourceUrl),
            })}
          />
          <span>
            Busy from{" "}
            <span className={agendaEventTime()}>
              {formatTime(new Date(event.startTime))}
            </span>{" "}
            to{" "}
            <span className={agendaEventTime()}>
              {formatTime(new Date(event.endTime))}
            </span>
            {event.sourceName && (
              <>
                {" "}
                according to an event from{" "}
                <span className={agendaEventSource()}>{event.sourceName}</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

const LoadingIndicator = () => (
  <div className="py-4 text-center">
    <TextBody>Loading more events...</TextBody>
  </div>
);

export const Calendar = ({
  events = [],
  startDate = new Date(),
  daysToShow = 7,
  isLoadingMore = false,
  lastSectionRef,
}: CalendarProps) => {
  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);

  const days = getDaysFromDate(normalizedStartDate, daysToShow);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events
      .filter((event) => isSameDay(new Date(event.startTime), date))
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  };

  return (
    <div className={agendaContainer()}>
      {days.map((date, index) => {
        const isLast = index === days.length - 1;
        return (
          <section
            key={date.toISOString()}
            ref={isLast ? lastSectionRef : undefined}
            className={agendaDaySection()}
          >
            <h2 className={agendaDayHeading()}>{formatDayHeading(date)}</h2>
            <DayEventList events={getEventsForDay(date)} />
          </section>
        );
      })}
      {isLoadingMore && <LoadingIndicator />}
    </div>
  );
};
