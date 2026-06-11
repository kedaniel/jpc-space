import Link from "next/link";
import { format } from "date-fns";
import { PenLine } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Quizzes" };

export default async function LeaderQuizzesPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  const groups = user.groupLeaderIds.length
    ? await db.group.findMany({
        where: { id: { in: user.groupLeaderIds } },
        select: {
          id: true,
          seasonId: true,
          students: { select: { studentUserId: true } },
        },
      })
    : [];

  const seasonId = groups[0]?.seasonId ?? null;
  const studentIds = groups.flatMap((g) => g.students.map((s) => s.studentUserId));

  const quizzes = seasonId
    ? await db.quiz.findMany({
        where: { seasonId },
        orderBy: [{ session: { startsAt: "desc" } }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          maxScore: true,
          sessionId: true,
          session: { select: { title: true, startsAt: true } },
          grades: {
            where: { studentUserId: { in: studentIds } },
            select: { studentUserId: true, score: true },
          },
        },
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Quizzes</h1>
        <p className="mt-1 text-sm text-neutral-500">Grade paper quizzes for your group</p>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No quizzes yet"
          description="Quizzes created by your admin will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => {
            const totalStudents = studentIds.length;
            const gradedCount = q.grades.filter((g) => g.score !== null).length;
            const fullyGraded = gradedCount >= totalStudents && totalStudents > 0;

            return (
              <Link
                key={q.id}
                href={q.sessionId ? `/leader/sessions/${q.sessionId}/quiz/${q.id}` : "#"}
                className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-navy-900">{q.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {q.session ? `${q.session.title} · ${format(q.session.startsAt, "MMM d, yyyy")}` : "No session"}
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
