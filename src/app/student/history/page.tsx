import { format } from "date-fns";
import { Sparkles } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "History" };

/**
 * Privacy-critical page: shows past seasons the student participated in,
 * but DELIBERATELY DOES NOT FETCH submissions, feedback, or engagement notes.
 * Curriculum view is limited to session titles + dates.
 */
export default async function StudentHistoryPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  // Past enrollments only â€” exclude the student's current active season.
  const enrollments = await db.seasonEnrollment.findMany({
    where: {
      studentUserId: user.userId,
      ...(user.activeSeasonId ? { seasonId: { not: user.activeSeasonId } } : {}),
    },
    orderBy: { enrolledAt: "desc" },
    select: {
      seasonId: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      season: {
        select: {
          id: true,
          title: true,
          code: true,
          status: true,
          startDate: true,
          endDate: true,
          coverImagePath: true,
        },
      },
      group: { select: { name: true } },
    },
  });

  if (enrollments.length === 0) {
    return (
      <>
        <PageHeader title="History" description="Seasons you've participated in." />
        <EmptyState
          icon={Sparkles}
          title="No past seasons"
          description="Once you complete a season, it'll appear here."
        />
      </>
    );
  }

  // Compute attendance % per past season â€” NO submission data fetched here.
  const seasonIds = enrollments.map((e) => e.seasonId);
  const attendanceByseason = new Map<number, { total: number; present: number }>();
  for (const sid of seasonIds) {
    const total = await db.session.count({ where: { seasonId: sid } });
    const present = await db.attendance.count({
      where: {
        studentUserId: user.userId,
        session: { seasonId: sid },
        status: { in: ["PRESENT", "LATE"] },
      },
    });
    attendanceByseason.set(sid, { total, present });
  }

  // Curriculum (session titles + dates only). NO materials, NO notes content.
  const curriculaBySeason = new Map<number, { id: number; title: string; startsAt: Date }[]>();
  for (const sid of seasonIds) {
    const sessions = await db.session.findMany({
      where: { seasonId: sid },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true },
    });
    curriculaBySeason.set(sid, sessions);
  }

  return (
    <>
      <PageHeader
        title="History"
        description="Past seasons you participated in."
      />
      <ol className="flex flex-col gap-4">
        {enrollments.map((e) => {
          const att = attendanceByseason.get(e.seasonId) ?? { total: 0, present: 0 };
          const attendancePct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
          const sessions = curriculaBySeason.get(e.seasonId) ?? [];
          return (
            <li key={e.seasonId}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{e.season.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {format(e.season.startDate, "MMM d, yyyy")} â€“{" "}
                        {format(e.season.endDate, "MMM d, yyyy")}
                        {e.group?.name && ` آ· ${e.group.name}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{e.season.status}</Badge>
                      <Badge variant="success">Participated</Badge>
                      <Badge variant="info">{attendancePct}% attendance</Badge>
                    </div>
                  </div>
                </CardHeader>
                {sessions.length > 0 && (
                  <CardContent>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-foreground">
                        Curriculum ({sessions.length} sessions)
                      </summary>
                      <ol className="mt-2 flex flex-col gap-1 text-muted-foreground">
                        {sessions.map((s) => (
                          <li key={s.id} className="flex justify-between gap-3">
                            <span>{s.title}</span>
                            <span className="shrink-0 text-xs tabular-nums">
                              {format(s.startsAt, "MMM d, yyyy")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </CardContent>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
