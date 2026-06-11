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
            youtubeUrl: true,
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
        <StaggerReveal className="flex flex-col gap-4 md:gap-6">
          {engagement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {budget && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <Progress
                        value={budget.budgetPct}
                        className={[
                          "flex-1",
                          budget.budgetPct >= 80
                            ? "[&>div]:bg-error-500"
                            : budget.budgetPct >= 50
                              ? "[&>div]:bg-warning-500"
                              : "",
                        ].join(" ")}
                      />
                      <span
                        className={[
                          "text-sm font-semibold tabular-nums",
                          budget.budgetPct >= 80
                            ? "text-error-700 dark:text-error-400"
                            : budget.budgetPct >= 50
                              ? "text-warning-700 dark:text-warning-400"
                              : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {budget.minutesUsed}/{budget.budgetMinutes} min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Absence budget used ({budget.absentCount} absent,{" "}
                      {budget.lateCount} late)
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Week {weeksCompleted} of {weeksTotal} ·{" "}
                  {engagement.submissionsCompleted}/{engagement.submissionsExpected}{" "}
                  assignments submitted
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Next session</CardTitle>
              <Button variant="ghost" size="sm" render={<Link href="/student/calendar" />}>
                See calendar
              </Button>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{nextSession.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(nextSession.startsAt, "EEE, MMM d · h:mm a")} ·{" "}
                    {nextSession.durationMinutes} min
                    {nextSession.location ? ` · ${nextSession.location}` : ""}
                  </p>
                  <p className="text-xs text-info-700">
                    Starts {formatDistanceToNowStrict(nextSession.startsAt, { addSuffix: true })}
                  </p>
                </div>
                {nextSession.youtubeUrl && (
                  <a
                    href={nextSession.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-teal-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-teal-700"
                  >
                    Watch recording
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm italic text-neutral-400">
                No upcoming sessions.
              </p>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending assignments</CardTitle>
              <Button variant="ghost" size="sm" render={<Link href="/student/assignments" />}>
                See all
              </Button>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  Nothing pending — great job staying on top of it.
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
                          ? `Due ${format(a.dueAt, "MMM d")}`
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
