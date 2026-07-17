"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNowStrict,
  isPast,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { SessionListRow } from "@/lib/sessions-query";
import type { JpcEventRow } from "@/lib/jpc-events-query";
import { formatJpcEventWhen } from "@/lib/jpc-event-format";

export const SEASON_PALETTE = [
  "bg-info-800 text-info-300",
  "bg-success-800 text-success-300",
  "bg-warning-800 text-warning-300",
  "bg-error-800 text-error-300",
  "bg-brand-navy-700 text-brand-teal-300",
];

type View = "upcoming" | "week" | "month";

const VIEWS: { key: View; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Chip styling for a session inside the grid. Theme-aware for the common
 *  single-season case; falls back to the multi-season palette for SUPER. */
function sessionCellClass(
  s: SessionListRow,
  seasonColors?: Record<string, string>,
): string {
  if (seasonColors)
    return seasonColors[s.seasonCode] ?? "bg-brand-navy-800 text-brand-teal-400";
  if (isToday(s.startsAt))
    return "bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-200";
  if (isPast(s.startsAt)) return "bg-muted text-muted-foreground";
  return "bg-brand-teal-100 text-brand-teal-800 dark:bg-brand-teal-950 dark:text-brand-teal-200";
}

function eventCellClass(e: JpcEventRow): string {
  return e.visibility === "ALUMNI_ONLY"
    ? "bg-warning-100 text-warning-800 dark:bg-warning-950 dark:text-warning-200"
    : "bg-brand-navy-100 text-brand-navy-800 dark:bg-brand-navy-900 dark:text-brand-navy-100";
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
  return template.replace("{id}", String(s.id)).replace("{seasonCode}", s.seasonCode);
}

export function SeasonCalendar({
  sessions,
  jpcEvents,
  sessionPathTemplate,
  seasonColors,
}: SeasonCalendarProps) {
  const [view, setView] = React.useState<View>("upcoming");
  const [current, setCurrent] = React.useState<Date>(() => {
    const upcoming = sessions.find((s) => !isPast(s.startsAt) || isToday(s.startsAt));
    if (upcoming) return startOfMonth(upcoming.startsAt);
    const last = sessions.at(-1);
    return startOfMonth(last?.startsAt ?? new Date());
  });

  if (sessions.length === 0 && jpcEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Nothing scheduled yet"
        description="Sessions and events will appear here once they're added."
      />
    );
  }

  const sessionsByDay = new Map<string, SessionListRow[]>();
  for (const s of sessions) {
    const key = format(s.startsAt, "yyyy-MM-dd");
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), s]);
  }
  const eventsByDay = new Map<string, JpcEventRow[]>();
  for (const e of jpcEvents) {
    const start = startOfDay(e.date);
    const end = e.endDate ? startOfDay(e.endDate) : start;
    const days = end > start ? eachDayOfInterval({ start, end }).slice(0, 366) : [start];
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
    }
  }

  function stepLabel(): string {
    if (view === "week") {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} – ${format(end, isSameMonth(start, end) ? "d" : "MMM d")}`;
    }
    return format(current, "MMMM yyyy");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* View switcher + step nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Calendar view"
          className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5"
        >
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === v.key
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view !== "upcoming" && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrent((d) => (view === "week" ? subWeeks(d, 1) : subMonths(d, 1)))
              }
              aria-label={view === "week" ? "Previous week" : "Previous month"}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-semibold text-foreground">
              {stepLabel()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrent((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)))
              }
              aria-label={view === "week" ? "Next week" : "Next month"}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Season legend (super only) */}
      {seasonColors && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(seasonColors).map(([code, cls]) => (
            <span key={code} className={cn("inline-flex items-center rounded px-2 py-0.5", cls)}>
              {code}
            </span>
          ))}
        </div>
      )}

      {view === "upcoming" ? (
        <AgendaView
          sessions={sessions}
          jpcEvents={jpcEvents}
          sessionPathTemplate={sessionPathTemplate}
          seasonColors={seasonColors}
        />
      ) : (
        <CalendarGrid
          view={view}
          current={current}
          sessionsByDay={sessionsByDay}
          eventsByDay={eventsByDay}
          sessionPathTemplate={sessionPathTemplate}
          seasonColors={seasonColors}
        />
      )}
    </div>
  );
}

/* ── Upcoming (agenda) ───────────────────────────────────────────────── */

type AgendaEntry =
  | { kind: "session"; at: Date; row: SessionListRow }
  | { kind: "event"; at: Date; row: JpcEventRow };

function AgendaView({
  sessions,
  jpcEvents,
  sessionPathTemplate,
  seasonColors,
}: Omit<SeasonCalendarProps, "sessions" | "jpcEvents"> & {
  sessions: SessionListRow[];
  jpcEvents: JpcEventRow[];
}) {
  const today = startOfDay(new Date());
  const entries: AgendaEntry[] = [
    ...sessions
      .filter((s) => s.startsAt >= today)
      .map((s) => ({ kind: "session" as const, at: s.startsAt, row: s })),
    ...jpcEvents
      .filter((e) => (e.endDate ?? e.date) >= today)
      .map((e) => ({ kind: "event" as const, at: e.date, row: e })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Nothing coming up"
        description="You're all caught up. Switch to Month to review past sessions."
      />
    );
  }

  const groups = new Map<string, AgendaEntry[]>();
  for (const entry of entries) {
    const key = format(entry.at, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([key, items]) => {
        const date = items[0].at;
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {format(date, "EEEE, MMMM d")}
              </p>
              <p className="text-[10px] font-medium text-brand-teal-700 dark:text-brand-teal-300">
                {isToday(date)
                  ? "Today"
                  : `in ${formatDistanceToNowStrict(date, { unit: "day" })}`}
              </p>
            </div>
            {items.map((entry) =>
              entry.kind === "session" ? (
                <AgendaSession
                  key={`s-${entry.row.id}`}
                  s={entry.row}
                  href={buildSessionHref(sessionPathTemplate, entry.row)}
                  seasonColors={seasonColors}
                />
              ) : (
                <AgendaEvent key={`e-${entry.row.id}`} e={entry.row} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimeRail({ date }: { date: Date }) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center justify-center">
      <span className="text-sm font-bold leading-none text-foreground">
        {format(date, "h:mm")}
      </span>
      <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
        {format(date, "a")}
      </span>
    </div>
  );
}

function AgendaSession({
  s,
  href,
  seasonColors,
}: {
  s: SessionListRow;
  href: string;
  seasonColors?: Record<string, string>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] transition-colors hover:bg-accent"
    >
      <TimeRail date={s.startsAt} />
      <span className="h-10 w-px shrink-0 bg-border" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-navy-900 dark:text-foreground">
          {s.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{s.durationMinutes} min</span>
          {s.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              {s.location}
            </span>
          )}
          {seasonColors && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                seasonColors[s.seasonCode] ?? "bg-brand-navy-800 text-brand-teal-400",
              )}
            >
              {s.seasonCode}
            </span>
          )}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function AgendaEvent({ e }: { e: JpcEventRow }) {
  const inner = (
    <>
      <div className="flex w-12 shrink-0 flex-col items-center justify-center text-muted-foreground">
        <Calendar className="size-4" />
      </div>
      <span className="h-10 w-px shrink-0 bg-border" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-brand-navy-900 dark:text-foreground">
          {e.visibility === "ALUMNI_ONLY" && <Lock className="size-3 shrink-0" />}
          {e.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatJpcEventWhen(e.date, e.endDate)}
        </p>
      </div>
      {e.url && <ExternalLink className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const className =
    "flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] transition-colors hover:bg-accent";
  return e.url ? (
    <a href={e.url} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/* ── Week / Month grid ───────────────────────────────────────────────── */

function CalendarGrid({
  view,
  current,
  sessionsByDay,
  eventsByDay,
  sessionPathTemplate,
  seasonColors,
}: {
  view: "week" | "month";
  current: Date;
  sessionsByDay: Map<string, SessionListRow[]>;
  eventsByDay: Map<string, JpcEventRow[]>;
  sessionPathTemplate: string;
  seasonColors?: Record<string, string>;
}) {
  const days =
    view === "week"
      ? eachDayOfInterval({
          start: startOfWeek(current, { weekStartsOn: 1 }),
          end: endOfWeek(current, { weekStartsOn: 1 }),
        })
      : eachDayOfInterval({
          start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
        });

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs">
      {DOW.map((d) => (
        <div key={d} className="bg-card py-2 text-center font-medium text-muted-foreground">
          {d}
        </div>
      ))}

      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const daySessions = sessionsByDay.get(key) ?? [];
        const dayEvents = eventsByDay.get(key) ?? [];
        const dimmed = view === "month" && !isSameMonth(day, current);
        const today = isToday(day);

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-0.5 bg-card p-1",
              view === "week" ? "min-h-32" : "min-h-[72px]",
              dimmed && "opacity-40",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center self-start rounded-full text-xs font-medium",
                today ? "bg-brand-teal-500 text-brand-navy-950" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>

            {daySessions.map((s) => (
              <Link
                key={s.id}
                href={buildSessionHref(sessionPathTemplate, s)}
                className={cn(
                  "block truncate rounded px-1 py-0.5 font-medium leading-tight",
                  sessionCellClass(s, seasonColors),
                )}
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
                  className={cn(
                    "flex items-center gap-0.5 truncate rounded px-1 py-0.5 leading-tight",
                    eventCellClass(e),
                  )}
                  title={e.title}
                >
                  {e.visibility === "ALUMNI_ONLY" && <Lock className="size-2.5 shrink-0" />}
                  <span className="truncate">{e.title}</span>
                  <ExternalLink className="ml-auto size-2.5 shrink-0" />
                </a>
              ) : (
                <span
                  key={e.id}
                  className={cn(
                    "flex items-center gap-0.5 truncate rounded px-1 py-0.5 leading-tight",
                    eventCellClass(e),
                  )}
                  title={e.title}
                >
                  {e.visibility === "ALUMNI_ONLY" && <Lock className="size-2.5 shrink-0" />}
                  <span className="truncate">{e.title}</span>
                </span>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
