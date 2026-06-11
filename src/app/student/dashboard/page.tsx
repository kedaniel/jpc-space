import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { Sparkles } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeEngagementForStudent, computeAttendanceBudget, computeAttendanceStreak } from "@/lib/engagement";
import { listAssignmentsForStudent } from "@/lib/assignments-query";
import { StaggerReveal } from "@/components/motion/stagger-reveal";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/students/stat-card";

export const metadata = { title: "Dashboard" };

export default async function StudentDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const profile = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      studentProfile: {
        select: {
          activeSeason: {
            select: { id: true, title: true, code: true },
          },
        },
      },
    },
  });

  const seasonId = user.activeSeasonId;
  const season = profile?.studentProfile?.activeSeason ?? null;

  const [engagement, nextSession, assignments, budget, streak, allSubmissions] = seasonId
    ? await Promise.all([
        computeEngagementForStudent(user.userId, seasonId),
        db.session.findFirst({
          where: { seasonId, startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            title: true,
            startsAt: true,
            location: true,
            durationMinutes: true,
          },
        }),
        listAssignmentsForStudent(user.userId, seasonId),
        computeAttendanceBudget(user.userId, seasonId),
        computeAttendanceStreak(user.userId, seasonId),
        db.submission.findMany({
          where: {
            studentUserId: user.userId,
            status: { in: ["SUBMITTED", "REVIEWED", "RETURNED"] },
            submittedAt: { not: null },
            assignment: { seasonId, deletedAt: null, dueAt: { not: null } },
          },
          select: {
            submittedAt: true,
            assignment: { select: { dueAt: true } },
          },
        }),
      ])
    : ([null, null, [], null, 0, []] as const);

  const pending = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "DRAFT",
  );
  const lateCount = allSubmissions.filter(
    (s) => s.submittedAt != null && s.assignment.dueAt != null && s.submittedAt > s.assignment.dueAt!,
  ).length;

  let weeksCompleted = 0;
  let weeksTotal = 0;
  if (seasonId) {
    weeksTotal = await db.session.count({ where: { seasonId } });
    weeksCompleted = await db.session.count({
      where: { seasonId, startsAt: { lte: new Date() } },
    });
  }

  const progressPct =
    weeksTotal > 0 ? Math.round((weeksCompleted / weeksTotal) * 100) : 0;
  const attendancePct = budget
    ? Math.max(0, Math.round(100 - budget.budgetPct))
    : null;
  const firstName = profile?.name?.split(" ")[0] ?? "there";

  return (
    <StaggerReveal className="flex flex-col gap-3 md:gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">
          Hi, {firstName} 👋
        </h1>
        {season ? (
          <Badge variant="teal" className="mt-1.5">
            {season.title}
          </Badge>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">Welcome to JPC Space</p>
        )}
      </div>

      {/* ── Not enrolled ── */}
      {!season && (
        <>
          <EmptyState
            icon={Sparkles}
            title="Not enrolled yet"
            description="Contact your leader or admin to be enrolled in a season."
          />
          <div className="rounded-xl bg-brand-teal-100 p-4 ring-1 ring-brand-teal-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-teal-700">
              While you wait
            </p>
            <Link
              href="/student/profile"
              className="mt-1 block text-sm font-bold text-brand-teal-900 hover:underline"
            >
              Complete your profile →
            </Link>
          </div>
        </>
      )}

      {/* ── Active season ── */}
      {season && (
        <>
          {/* Hero progress card */}
          <div className="rounded-xl bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 p-4 shadow-[0_4px_20px_rgba(31,50,96,0.25)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-teal-300">
              Season progress
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-white">{progressPct}%</p>
                <p className="text-xs text-white/50">
                  Week {weeksCompleted} of {weeksTotal}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-white">
                  {engagement?.submissionsCompleted ?? 0}
                  <span className="text-sm font-semibold text-white/40">
                    /{engagement?.submissionsExpected ?? 0}
                  </span>
                </p>
                <p className="text-xs text-white/50">assignments</p>
              </div>
            </div>
            <Progress
              value={progressPct}
              className="mt-3 h-1.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-brand-teal-400 [&>div]:to-brand-teal-300"
            />
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Attendance"
              value={attendancePct !== null ? `${attendancePct}%` : "—"}
            />
            <StatCard
              label="Streak"
              value={streak > 0 ? `🔥 ${streak}` : streak}
            />
            <StatCard
              label="Pending"
              value={pending.length}
              variant={pending.length > 0 ? "teal" : "white"}
            />
          </div>
          {lateCount > 0 && (
            <div className="rounded-xl bg-warning-50 p-3 ring-1 ring-warning-200">
              <p className="text-xs font-bold text-warning-800">
                ⚠ {lateCount} assignment{lateCount !== 1 ? "s" : ""} submitted late this season
              </p>
            </div>
          )}

          {/* Next session */}
          <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Next session
            </p>
            {nextSession ? (
              <div className="mt-2 flex items-start gap-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-teal-500" />
                <div>
                  <p className="text-sm font-bold text-brand-navy-900">
                    {nextSession.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {format(nextSession.startsAt, "EEE, MMM d · h:mm a")} ·{" "}
                    {nextSession.durationMinutes} min
                    {nextSession.location ? ` · ${nextSession.location}` : ""}
                  </p>
                  <Badge variant="teal" className="mt-1.5 text-[10px]">
                    {formatDistanceToNowStrict(nextSession.startsAt, {
                      addSuffix: true,
                    })}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm italic text-neutral-400">
                No upcoming sessions.
              </p>
            )}
          </div>

          {/* Due soon */}
          {pending.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Due soon
                </p>
                <Link
                  href="/student/assignments"
                  className="text-xs font-semibold text-brand-teal-700 hover:underline"
                >
                  See all
                </Link>
              </div>
              <ul className="mt-2 flex flex-col divide-y divide-neutral-100">
                {pending.slice(0, 3).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/student/assignments/${a.id}`}
                      className="flex-1 truncate text-sm font-semibold text-brand-navy-900 hover:underline"
                    >
                      {a.title}
                    </Link>
                    {a.dueAt && (
                      <Badge
                        variant={isPast(a.dueAt) ? "error" : "warning"}
                        className="shrink-0 text-[10px]"
                      >
                        {isPast(a.dueAt)
                          ? "Past due"
                          : `Due in ${formatDistanceToNowStrict(a.dueAt)}`}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </>
      )}
    </StaggerReveal>
  );
}
