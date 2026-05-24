import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertCircle, Sparkles, Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeEngagementForStudent } from "@/lib/engagement";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Mentor dashboard" };

const AT_RISK_THRESHOLD = 60;

export default async function MentorDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);

  // All active-season students.
  const activeStudents = await db.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      studentProfile: { activeSeasonId: { not: null } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      studentProfile: {
        select: {
          activeSeasonId: true,
          activeSeason: { select: { title: true } },
        },
      },
    },
  });

  // Compute engagement for each in current active season.
  const enrichedPromises = activeStudents.map(async (s) => {
    const seasonId = s.studentProfile!.activeSeasonId!;
    const e = await computeEngagementForStudent(s.id, seasonId);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      seasonTitle: s.studentProfile!.activeSeason!.title,
      engagement: e,
    };
  });
  const enriched = await Promise.all(enrichedPromises);

  const atRisk = enriched
    .filter(
      (s) =>
        s.engagement.attendancePct < AT_RISK_THRESHOLD ||
        s.engagement.submissionPct < AT_RISK_THRESHOLD,
    )
    .sort((a, b) => a.engagement.score - b.engagement.score)
    .slice(0, 10);

  // Recently active: latest attendance + submissions across all students.
  const recentAttendance = await db.attendance.findMany({
    where: { studentUser: { role: "STUDENT" } },
    orderBy: { markedAt: "desc" },
    take: 8,
    select: {
      id: true,
      status: true,
      markedAt: true,
      studentUser: { select: { id: true, name: true } },
      session: { select: { title: true } },
    },
  });
  const recentSubmissions = await db.submission.findMany({
    where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
    orderBy: { submittedAt: "desc" },
    take: 8,
    select: {
      id: true,
      publicId: true,
      status: true,
      submittedAt: true,
      studentUser: { select: { id: true, name: true } },
      assignment: { select: { title: true } },
    },
  });

  return (
    <AppShell user={user} title="Mentor dashboard">
      <PageHeader
        title="Mentor dashboard"
        description="Cross-season pastoral view. You can read everything; writes are limited to your notes."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-2">
                <AlertCircle className="size-4 text-warning-600" />
                Flagged for follow-up
              </span>
            </CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/mentor/students" />}>
              All students
            </Button>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nobody flagged"
                description="All students above the 60% engagement threshold."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {atRisk.map((s) => (
                  <li key={s.id} className="py-2 first:pt-0 last:pb-0">
                    <Link
                      href={`/mentor/students/${s.id}`}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">{s.name ?? s.email}</span>
                        <span className="text-xs text-muted-foreground">{s.seasonTitle}</span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <Badge variant="warning" className="text-[10px]">
                          {s.engagement.attendancePct}% att.
                        </Badge>
                        <Badge variant="error" className="text-[10px]">
                          {s.engagement.submissionPct}% sub.
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-info-600" />
                Recent activity
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {recentAttendance.slice(0, 4).map((a) => (
                <li
                  key={`att-${a.id}`}
                  className="flex items-start justify-between gap-3 py-2 first:pt-0"
                >
                  <span className="text-sm">
                    <Link
                      href={`/mentor/students/${a.studentUser.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.studentUser.name ?? "Student"}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      marked {a.status.toLowerCase()} for {a.session.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(a.markedAt, { addSuffix: true })}
                  </span>
                </li>
              ))}
              {recentSubmissions.slice(0, 4).map((s) => (
                <li
                  key={`sub-${s.id}`}
                  className="flex items-start justify-between gap-3 py-2 last:pb-0"
                >
                  <span className="text-sm">
                    <Link
                      href={`/mentor/students/${s.studentUser.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.studentUser.name ?? "Student"}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      {s.status === "REVIEWED" ? "received feedback on" : "submitted"}{" "}
                    </span>
                    <Link
                      href={`/leader/submissions/${s.publicId}`}
                      className="hover:underline"
                    >
                      {s.assignment.title}
                    </Link>
                  </span>
                  {s.submittedAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(s.submittedAt, { addSuffix: true })}
                    </span>
                  )}
                </li>
              ))}
              {recentAttendance.length === 0 && recentSubmissions.length === 0 && (
                <p className="py-4 text-center text-sm italic text-muted-foreground">
                  No recent activity.
                </p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickLink href="/mentor/students" label="Students" />
        <QuickLink href="/mentor/notes" label="My notes" />
        <QuickLink href="/mentor/reports" label="Reports" />
        <QuickLink href="/mentor/settings" label="Settings" />
      </div>
    </AppShell>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-neutral-200 bg-white p-3 text-center text-sm font-medium text-foreground transition-colors hover:border-brand-teal-400 hover:bg-brand-teal-50"
    >
      {label}
    </Link>
  );
}
