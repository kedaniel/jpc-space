import Link from "next/link";
import { format } from "date-fns";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Current season" };

export default async function StudentSeasonPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  if (!user.activeSeasonId) {
    return (
      <div className="flex flex-col gap-3 md:gap-4">
        <h1 className="text-2xl font-black text-brand-navy-900">
          Current season
        </h1>
        <EmptyState
          icon={Users}
          title="No active season"
          description="An admin will enroll you when you're ready."
        />
      </div>
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
      <div className="flex flex-col gap-3 md:gap-4">
        <h1 className="text-2xl font-black text-brand-navy-900">Current season</h1>
        <p className="text-sm text-neutral-500">Season not found.</p>
      </div>
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

      {/* Description */}
      {season.description && (
        <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            About this season
          </p>
          <p className="text-sm text-neutral-700">{season.description}</p>
        </div>
      )}

      {/* Group card */}
      {membership?.group && (
        <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Your group — {membership.group.name}
          </p>
          {membership.group.description && (
            <p className="mb-3 text-sm text-neutral-600">
              {membership.group.description}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-xs font-bold text-neutral-400">Leaders</p>
              <ul className="flex flex-col gap-0.5 text-sm text-brand-navy-900">
                {membership.group.leaders.map((l, i) => (
                  <li key={i}>{l.user.name ?? l.user.email}</li>
                ))}
                {membership.group.leaders.length === 0 && (
                  <li className="italic text-neutral-400">
                    No leaders assigned yet.
                  </li>
                )}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-neutral-400">
                Members ({membership.group.students.length})
              </p>
              <ul className="grid grid-cols-2 gap-1 text-sm text-brand-navy-900">
                {membership.group.students.map((s) => (
                  <li key={s.studentUser.id}>{s.studentUser.name ?? "—"}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Upcoming sessions
          </p>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/student/calendar" />}
            className="text-xs text-brand-teal-700"
          >
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
                  <p className="text-xs text-neutral-500">
                    {format(s.startsAt, "EEE, MMM d · h:mm a")}
                    {s.location && ` · ${s.location}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
