"use client";

import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";

const CHECK_IN_DURATION_MS = 3 * 60 * 60 * 1000;

function resolveCheckIn(
  s: { checkInToken: string | null; checkInOpenAt: Date | null; checkInClosedAt: Date | null },
  baseUrl: string,
): { isOpen: boolean; checkInUrl: string | null } {
  const isOpen =
    !!s.checkInOpenAt &&
    !s.checkInClosedAt &&
    Date.now() - s.checkInOpenAt.getTime() < CHECK_IN_DURATION_MS;
  const checkInUrl = s.checkInToken ? `${baseUrl}/checkin/${s.checkInToken}` : null;
  return { isOpen, checkInUrl };
}

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SessionCheckInControls } from "@/components/sessions/session-checkin-controls";
import type { SessionListRow } from "@/lib/sessions-query";

interface CalendarListProps {
  sessions: SessionListRow[];
  basePath: string;
  createHref?: string;
  showAttendanceLink?: boolean;
  showCheckIn?: boolean;
  checkInBaseUrl?: string;
}

function statusBadge(s: SessionListRow) {
  if (isToday(s.startsAt)) return <Badge variant="info">Today</Badge>;
  if (isPast(s.startsAt)) {
    return s.attendanceMarked ? (
      <Badge variant="success">Attendance marked</Badge>
    ) : (
      <Badge variant="warning">Attendance pending</Badge>
    );
  }
  return <Badge variant="outline">Upcoming</Badge>;
}

export function CalendarList({
  sessions,
  basePath,
  createHref,
  showAttendanceLink,
  showCheckIn,
  checkInBaseUrl,
}: CalendarListProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No sessions yet"
        description="Add sessions to the season calendar."
        action={
          createHref ? (
            <Button render={<Link href={createHref} />}>Add session</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {sessions.map((s) => {
        const checkIn =
          showCheckIn && checkInBaseUrl ? resolveCheckIn(s, checkInBaseUrl) : null;
        return (
          <li
            key={s.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${basePath}/${s.id}`}
                    className="text-base font-semibold text-foreground hover:underline"
                  >
                    {s.title}
                  </Link>
                  {statusBadge(s)}
                  {s.recurrenceGroupId && (
                    <Badge variant="outline" className="text-xs">
                      Series
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(s.startsAt, "EEE, MMM d, yyyy · h:mm a")} · {s.durationMinutes} min
                </p>
                {s.location && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {s.location}
                  </p>
                )}
              </div>
              {(showAttendanceLink || checkIn) && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {checkIn && (
                    <SessionCheckInControls
                      sessionId={s.id}
                      isOpen={checkIn.isOpen}
                      checkInUrl={checkIn.checkInUrl}
                    />
                  )}
                  {showAttendanceLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`${basePath}/${s.id}/attendance`} />}
                    >
                      Mark attendance
                    </Button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
