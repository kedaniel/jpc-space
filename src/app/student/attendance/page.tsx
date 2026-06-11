import Link from "next/link";
import { format } from "date-fns";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeAttendanceBudget } from "@/lib/engagement";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";
import type { AttendanceStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Attendance" };

function statusBadge(status: AttendanceStatus | null) {
  if (!status) return <Badge variant="outline">No record</Badge>;
  if (status === "PRESENT") return <Badge variant="success">Present</Badge>;
  if (status === "LATE") return <Badge variant="warning">Late</Badge>;
  if (status === "ABSENT") return <Badge variant="error">Absent</Badge>;
  if (status === "EXCUSED") return <Badge variant="outline">Excused</Badge>;
  return null;
}

export default async function StudentAttendancePage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const seasonId = user.activeSeasonId;

  if (!seasonId) {
    return (
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <Link href="/student/dashboard" className="text-xs font-semibold text-brand-teal-700 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-black text-brand-navy-900">Attendance</h1>
        </div>
        <EmptyState icon={Calendar} title="Not enrolled" description="Enroll in a season to track attendance." />
      </div>
    );
  }

  const [budget, season, pastSessions] = await Promise.all([
    computeAttendanceBudget(user.userId, seasonId),
    db.season.findUnique({
      where: { id: seasonId },
      select: {
        absenceWeightMinutes: true,
        lateWeightMinutes: true,
        absenceBudgetMinutes: true,
        lateThresholdMinutes: true,
      },
    }),
    db.session.findMany({
      where: { seasonId, startsAt: { lte: new Date() } },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        checkInOpenAt: true,
        attendance: {
          where: { studentUserId: user.userId },
          select: {
            status: true,
            checkedInAt: true,
            markedAt: true,
          },
        },
      },
    }),
  ]);

  const budgetPct = budget?.budgetPct ?? 0;
  const minutesUsed = budget?.minutesUsed ?? 0;
  const budgetMinutes = budget?.budgetMinutes ?? (season?.absenceBudgetMinutes ?? 180);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Header */}
      <div>
        <Link href="/student/dashboard" className="text-xs font-semibold text-brand-teal-700 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-black text-brand-navy-900">Attendance</h1>
      </div>

      {/* Budget hero */}
      <div className="rounded-xl bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 p-4 shadow-[0_4px_20px_rgba(31,50,96,0.25)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-teal-300">
          Absence budget used
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-black text-white">{minutesUsed} min</p>
            <p className="text-xs text-white/50">of {budgetMinutes} min budget</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{budgetPct}%</p>
            <p className="text-xs text-white/50">used</p>
          </div>
        </div>
        <Progress
          value={budgetPct}
          className="mt-3 h-1.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-brand-teal-400 [&>div]:to-brand-teal-300"
        />
        {season && (
          <p className="mt-2 text-[10px] text-white/40">
            Absent = {season.absenceWeightMinutes} min · Late = {season.lateWeightMinutes} min
          </p>
        )}
      </div>

      {/* Session breakdown */}
      {pastSessions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Past sessions will appear here."
        />
      ) : (
        <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
          <p className="px-4 pt-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Session history
          </p>
          <ul className="mt-2 divide-y divide-neutral-100">
            {pastSessions.map((s) => {
              const record = s.attendance[0] ?? null;
              const status = record?.status ?? null;

              // Actual late minutes: prefer QR check-in time, fall back to marked time
              let lateMinutes: number | null = null;
              if (status === "LATE" && s.checkInOpenAt) {
                const ref = record?.checkedInAt ?? record?.markedAt;
                if (ref) {
                  lateMinutes = Math.max(
                    0,
                    Math.floor((ref.getTime() - s.checkInOpenAt.getTime()) / 60_000),
                  );
                }
              }

              // Budget cost for this session
              let costMinutes: number | null = null;
              if (status === "ABSENT" && season) costMinutes = season.absenceWeightMinutes;
              if (status === "LATE" && season) costMinutes = season.lateWeightMinutes;

              return (
                <li key={s.id} className="flex items-start gap-3 px-4 py-3 last:pb-4">
                  <div className="mt-0.5 flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy-900">
                      {s.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(s.startsAt, "EEE, MMM d, yyyy · h:mm a")}
                    </p>
                    {lateMinutes !== null && lateMinutes > 0 && (
                      <p className="mt-0.5 text-xs text-warning-700">
                        {lateMinutes} min late
                      </p>
                    )}
                    {costMinutes !== null && costMinutes > 0 && (
                      <p className="mt-0.5 text-xs text-error-600">
                        −{costMinutes} min from budget
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {statusBadge(status)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
