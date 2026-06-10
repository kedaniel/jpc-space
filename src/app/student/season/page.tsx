import Link from "next/link";
import { format } from "date-fns";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Current season" };

export default async function StudentSeasonPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  if (!user.activeSeasonId) {
    return (
      <>
        <PageHeader title="Current season" description="You aren't enrolled in an active season." />
        <EmptyState
          icon={Users}
          title="No active season"
          description="An admin will enroll you when you're ready."
        />
      </>
    );
  }

  const season = await db.season.findUnique({
    where: { id: user.activeSeasonId },
    select: {
      id: true,
      title: true,
      code: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!season) {
    return (
      <>
        <PageHeader title="Current season" description="Season not found." />
      </>
    );
  }

  const membership = await db.groupStudent.findUnique({
    where: { studentUserId: user.userId },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          leaders: {
            select: { user: { select: { name: true, email: true } } },
          },
          students: {
            select: { studentUser: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const upcomingSessions = await db.session.findMany({
    where: { seasonId: season.id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: { id: true, title: true, startsAt: true, location: true },
  });

  return (
    <>
      <PageHeader
        title={season.title}
        description={`${format(season.startDate, "MMM d, yyyy")} – ${format(season.endDate, "MMM d, yyyy")}`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">{season.status}</Badge>
        {membership?.group && (
          <Badge variant="secondary">{membership.group.name}</Badge>
        )}
      </div>

      {season.description && (
        <Card className="mb-4">
          <CardContent className="pt-6 text-sm">{season.description}</CardContent>
        </Card>
      )}

      {membership?.group && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Your group: {membership.group.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {membership.group.description && (
              <p className="text-sm text-muted-foreground">{membership.group.description}</p>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Leaders
              </p>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {membership.group.leaders.map((l, i) => (
                  <li key={i}>{l.user.name ?? l.user.email}</li>
                ))}
                {membership.group.leaders.length === 0 && (
                  <li className="italic text-muted-foreground">No leaders assigned yet.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Group members ({membership.group.students.length})
              </p>
              <ul className="mt-1 grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                {membership.group.students.map((s) => (
                  <li key={s.studentUser.id}>{s.studentUser.name ?? "—"}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming sessions</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/student/calendar" />}>
            See calendar
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No upcoming sessions.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {upcomingSessions.map((s) => (
                <li key={s.id} className="py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(s.startsAt, "EEE, MMM d · h:mm a")}
                    {s.location && ` · ${s.location}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
