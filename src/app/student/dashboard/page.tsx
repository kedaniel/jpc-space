import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { Calendar, FileText, Sparkles, User } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeEngagementForStudent } from "@/lib/engagement";
import { listAssignmentsForStudent } from "@/lib/assignments-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextView } from "@/components/ui/rich-text-view";

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
            select: { id: true, title: true, code: true, startDate: true, endDate: true },
          },
        },
      },
    },
  });

  const seasonId = user.activeSeasonId;
  const season = profile?.studentProfile?.activeSeason ?? null;

  const [engagement, nextSession, assignments, recentFeedback] = seasonId
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
        db.submission.findMany({
          where: { studentUserId: user.userId, status: "REVIEWED" },
          orderBy: { reviewedAt: "desc" },
          take: 3,
          select: {
            id: true,
            feedback: true,
            reviewedAt: true,
            assignment: { select: { id: true, title: true } },
          },
        }),
      ])
    : [null, null, [], []];

  const pending = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "DRAFT",
  );

  let weeksCompleted = 0;
  let weeksTotal = 0;
  if (seasonId) {
    weeksTotal = await db.session.count({ where: { seasonId } });
    weeksCompleted = await db.session.count({
      where: { seasonId, startsAt: { lte: new Date() } },
    });
  }

  return (
    <AppShell user={user} title="Dashboard">
      <PageHeader
        title={`Hi, ${profile?.name?.split(" ")[0] ?? "there"}`}
        description={
          season
            ? `Your current season: ${season.title}`
            : "You aren't enrolled in an active season yet."
        }
      />

      {!season && (
        <EmptyState
          icon={Sparkles}
          title="Waiting on enrollment"
          description="Reach out to your leader or an admin to be enrolled in a season."
        />
      )}

      {season && (
        <div className="flex flex-col gap-4">
          {engagement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Progress value={engagement.attendancePct} className="flex-1" />
                  <span className="text-sm font-semibold tabular-nums">
                    {engagement.attendancePct}% attendance
                  </span>
                </div>
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
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No upcoming sessions on the calendar.
                </p>
              )}
            </CardContent>
          </Card>

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
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {pending.slice(0, 3).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/student/assignments/${a.id}`}
                        className="flex-1 truncate text-sm font-medium hover:underline"
                      >
                        {a.title}
                      </Link>
                      {a.dueAt && (
                        <Badge
                          variant={isPast(a.dueAt) ? "warning" : "info"}
                          className="text-[10px]"
                        >
                          {isPast(a.dueAt)
                            ? "Past due"
                            : `Due in ${formatDistanceToNowStrict(a.dueAt)}`}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {recentFeedback.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  Feedback on your submissions will appear here.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recentFeedback.map((s) => (
                    <li key={s.id} className="flex flex-col gap-1">
                      <Link
                        href={`/student/assignments/${s.assignment.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {s.assignment.title}
                      </Link>
                      {s.reviewedAt && (
                        <span className="text-xs text-muted-foreground">
                          Reviewed {format(s.reviewedAt, "MMM d, yyyy")}
                        </span>
                      )}
                      <RichTextView
                        html={s.feedback}
                        className="text-sm text-muted-foreground"
                        emptyText="No written feedback."
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickLink href="/student/calendar" icon={<Calendar />} label="Calendar" />
            <QuickLink href="/student/assignments" icon={<FileText />} label="Assignments" />
            <QuickLink href="/student/history" icon={<Sparkles />} label="History" />
            <QuickLink href="/student/profile" icon={<User />} label="Profile" />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white p-3 text-sm font-medium text-foreground transition-colors hover:border-brand-teal-400 hover:bg-brand-teal-50"
    >
      <span className="text-brand-teal-700 [&_svg]:size-5">{icon}</span>
      {label}
    </Link>
  );
}
