import Link from "next/link";
import { format } from "date-fns";
import { PenLine, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Quizzes" };

export default async function AdminQuizzesPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);

  const seasonIds = user.role === "ADMIN" ? user.seasonAdminIds : undefined;
  const season =
    (await db.season.findFirst({
      where: { ...(seasonIds ? { id: { in: seasonIds } } : {}), deletedAt: null, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: { id: true, title: true, code: true },
    })) ??
    (await db.season.findFirst({
      where: { ...(seasonIds ? { id: { in: seasonIds } } : {}), deletedAt: null },
      orderBy: { startDate: "desc" },
      select: { id: true, title: true, code: true },
    }));

  const totalStudents = season
    ? await db.studentProfile.count({ where: { activeSeasonId: season.id, deletedAt: null } })
    : 0;

  const quizzes = season
    ? await db.quiz.findMany({
        where: { seasonId: season.id },
        orderBy: [{ session: { startsAt: "desc" } }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          maxScore: true,
          sessionId: true,
          session: { select: { title: true, startsAt: true } },
          _count: { select: { grades: true } },
          grades: { select: { score: true } },
        },
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Quizzes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {season ? `All quizzes for ${season.title}` : "No season found"}
          </p>
        </div>
        {season && (
          <Link
            href={`/admin/season/${season.code}/calendar`}
            className="flex items-center gap-1.5 rounded-lg bg-brand-teal-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-teal-700"
          >
            <ExternalLink className="size-3" />
            Go to sessions
          </Link>
        )}
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No quizzes yet"
          description="Open a session from the calendar, then use the Quizzes card to add one."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => {
            const gradedCount = q.grades.filter((g) => g.score !== null).length;
            const fullyGraded = totalStudents > 0 && gradedCount >= totalStudents;

            return (
              <Link
                key={q.id}
                href={q.sessionId && season ? `/admin/season/${season.code}/sessions/${q.sessionId}` : "#"}
                className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-navy-900">{q.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {q.session
                      ? `${q.session.title} · ${format(q.session.startsAt, "MMM d, yyyy")}`
                      : "No session"}
                    {" · "}Max {q.maxScore} pts
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    {gradedCount}/{totalStudents} graded
                  </span>
                  {fullyGraded ? (
                    <Badge variant="success">Done</Badge>
                  ) : gradedCount > 0 ? (
                    <Badge variant="warning">Partial</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
