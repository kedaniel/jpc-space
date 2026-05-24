"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { saveAttendanceAction, type AttendanceEntryInput } from "@/lib/attendance-actions";
import type { AttendanceRosterEntry } from "@/lib/sessions-query";

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  className: string;
}[] = [
  { value: AttendanceStatus.PRESENT, label: "Present", icon: Check, className: "bg-success-100 text-success-800 ring-success-300" },
  { value: AttendanceStatus.LATE, label: "Late", icon: Clock, className: "bg-warning-100 text-warning-800 ring-warning-300" },
  { value: AttendanceStatus.EXCUSED, label: "Excused", icon: AlertCircle, className: "bg-info-100 text-info-800 ring-info-300" },
  { value: AttendanceStatus.ABSENT, label: "Absent", icon: X, className: "bg-error-100 text-error-800 ring-error-300" },
];

export interface AttendanceFormProps {
  sessionId: number;
  roster: AttendanceRosterEntry[];
  returnHref: string;
}

export function AttendanceForm({ sessionId, roster, returnHref }: AttendanceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [statuses, setStatuses] = React.useState<Map<number, AttendanceStatus | null>>(
    () => new Map(roster.map((r) => [r.studentUserId, r.status])),
  );

  function setStatus(studentUserId: number, status: AttendanceStatus) {
    setStatuses((prev) => {
      const next = new Map(prev);
      next.set(studentUserId, status);
      return next;
    });
  }

  function markAll(status: AttendanceStatus) {
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const [id] of next) next.set(id, status);
      return next;
    });
  }

  function save() {
    setError(null);
    const entries: AttendanceEntryInput[] = [];
    for (const [studentUserId, status] of statuses) {
      if (status) entries.push({ studentUserId, status, notes: null });
    }
    if (entries.length === 0) {
      setError("Mark at least one student before saving.");
      return;
    }
    startTransition(async () => {
      const result = await saveAttendanceAction(sessionId, entries);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(returnHref);
      router.refresh();
    });
  }

  if (roster.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-muted-foreground">
        No students are enrolled in this scope.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3">
        <span className="text-sm text-muted-foreground">
          Quick mark all as
        </span>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => markAll(opt.value)}
              disabled={pending}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {roster.map((r) => {
          const current = statuses.get(r.studentUserId) ?? null;
          return (
            <li
              key={r.studentUserId}
              className="rounded-lg border border-neutral-200 bg-white p-3"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name ?? r.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.groupName ? `${r.groupName} · ` : ""}
                    {r.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = current === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(r.studentUserId, opt.value)}
                        disabled={pending}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex h-9 min-w-[3.25rem] items-center justify-center gap-1 rounded-md px-2 text-xs font-medium ring-1 transition-colors disabled:opacity-50",
                          active
                            ? opt.className
                            : "ring-neutral-200 text-neutral-600 hover:bg-neutral-50",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">{error}</p>
      )}

      <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:justify-end md:bottom-0">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}
