"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { SessionListRow } from "@/lib/sessions-query";
import type { JpcEventRow } from "@/lib/jpc-events-query";

export const SEASON_PALETTE = [
  "bg-info-800 text-info-300",
  "bg-success-800 text-success-300",
  "bg-warning-800 text-warning-300",
  "bg-error-800 text-error-300",
  "bg-brand-navy-700 text-brand-teal-300",
];

function sessionCellClass(s: SessionListRow, seasonColors?: Record<string, string>): string {
  if (seasonColors) return seasonColors[s.seasonCode] ?? "bg-brand-navy-800 text-brand-teal-400";
  if (isToday(s.startsAt)) return "bg-success-800 text-success-300";
  if (isPast(s.startsAt)) return "bg-neutral-700 text-neutral-400";
  return "bg-brand-navy-800 text-brand-teal-400";
}

interface SeasonCalendarProps {
  sessions: SessionListRow[];
  jpcEvents: JpcEventRow[];
  /** URL template — use `{id}` and `{seasonCode}` as placeholders.
   *  e.g. "/student/sessions/{id}" or "/admin/season/{seasonCode}/sessions/{id}" */
  sessionPathTemplate: string;
  seasonColors?: Record<string, string>;
}

function buildSessionHref(template: string, s: SessionListRow): string {
  return template
    .replace("{id}", String(s.id))
    .replace("{seasonCode}", s.seasonCode);
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SeasonCalendar({
  sessions,
  jpcEvents,
  sessionPathTemplate,
  seasonColors,
}: SeasonCalendarProps) {
  const [current, setCurrent] = React.useState<Date>(() => {
    const upcoming = sessions.find((s) => !isPast(s.startsAt) || isToday(s.startsAt));
    if (upcoming) return startOfMonth(upcoming.startsAt);
    // All sessions are past — show the most recent session's month so the calendar isn't empty
    const last = sessions.at(-1);
    return startOfMonth(last?.startsAt ?? new Date());
  });

  if (sessions.length === 0 && jpcEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No sessions yet"
        description="Sessions will appear here once they're added to the season."
      />
    );
  }

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const sessionsByDay = new Map<string, SessionListRow[]>();
  for (const s of sessions) {
    const key = format(s.startsAt, "yyyy-MM-dd");
    const arr = sessionsByDay.get(key) ?? [];
    arr.push(s);
    sessionsByDay.set(key, arr);
  }

  const eventsByDay = new Map<string, JpcEventRow[]>();
  for (const e of jpcEvents) {
    const key = format(e.date, "yyyy-MM-dd");
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrent((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold">{format(current, "MMMM yyyy")}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrent((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Season legend (super only) */}
      {seasonColors && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(seasonColors).map(([code, cls]) => (
            <span key={code} className={`inline-flex items-center rounded px-2 py-0.5 ${cls}`}>
              {code}
            </span>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden text-xs">
        {/* Headers */}
        {DOW.map((d) => (
          <div
            key={d}
            className="bg-card text-center py-2 font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDay.get(key) ?? [];
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`bg-card min-h-[72px] p-1 flex flex-col gap-0.5 ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`self-start flex size-6 items-center justify-center rounded-full text-xs font-medium
                  ${today ? "bg-brand-teal-500 text-brand-navy-950" : "text-foreground"}`}
              >
                {format(day, "d")}
              </span>

              {daySessions.map((s) => (
                <Link
                  key={s.id}
                  href={buildSessionHref(sessionPathTemplate, s)}
                  className={`block rounded px-1 py-0.5 truncate font-medium leading-tight
                    ${sessionCellClass(s, seasonColors)}`}
                  title={s.title}
                >
                  {s.title}
                </Link>
              ))}

              {dayEvents.map((e) =>
                e.url ? (
                  <a
                    key={e.id}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-0.5 rounded px-1 py-0.5 truncate leading-tight
                      ${e.visibility === "ALUMNI_ONLY"
                        ? "bg-warning-800 text-warning-300"
                        : "bg-brand-teal-900 text-brand-teal-300"}`}
                    title={e.title}
                  >
                    {e.visibility === "ALUMNI_ONLY" && (
                      <Lock className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">{e.title}</span>
                    <ExternalLink className="size-2.5 shrink-0 ml-auto" />
                  </a>
                ) : (
                  <span
                    key={e.id}
                    className={`flex items-center gap-0.5 rounded px-1 py-0.5 truncate leading-tight
                      ${e.visibility === "ALUMNI_ONLY"
                        ? "bg-warning-800 text-warning-300"
                        : "bg-brand-teal-900 text-brand-teal-300"}`}
                    title={e.title}
                  >
                    {e.visibility === "ALUMNI_ONLY" && (
                      <Lock className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">{e.title}</span>
                  </span>
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
