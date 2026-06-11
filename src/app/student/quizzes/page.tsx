import { format } from "date-fns";
import { PenLine } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listQuizResultsForStudent } from "@/lib/quiz-query";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Quizzes" };

export default async function StudentQuizzesPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const profile = await db.studentProfile.findUnique({
    where: { userId: user.userId },
    select: { activeSeasonId: true },
  });
  const seasonId = profile?.activeSeasonId ?? null;

  const results = seasonId
    ? await listQuizResultsForStudent(user.userId, seasonId)
    : [];

  const totalQuizzes = results.length;
  const gradedQuizzes = results.filter((r) => r.score !== null);
  const avgScore =
    gradedQuizzes.length > 0
      ? Math.round(
          gradedQuizzes.reduce((sum, r) => sum + (r.score! / r.maxScore) * 100, 0) /
            gradedQuizzes.length,
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 p-5 text-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-teal-300">
          This season
        </p>
        <p className="mt-2 text-4xl font-black">
          {avgScore !== null ? `${avgScore}%` : "—"}
        </p>
        <p className="mt-1 text-sm text-brand-navy-200">Average quiz score</p>
        <p className="mt-3 text-xs text-brand-navy-300">
          {gradedQuizzes.length} graded · {totalQuizzes - gradedQuizzes.length} pending
        </p>
      </div>

      {/* Quiz list */}
      {results.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="No quizzes yet"
          description="Your quiz results will appear here once graded."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((r) => {
            const pct = r.score !== null ? Math.round((r.score / r.maxScore) * 100) : null;
            return (
              <div
                key={r.quizId}
                className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-navy-900">{r.title}</p>
                    {r.sessionTitle && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {r.sessionTitle}
                        {r.sessionDate ? ` · ${format(r.sessionDate, "MMM d, yyyy")}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {r.score !== null ? (
                      <>
                        <p className="text-lg font-black text-brand-navy-900">
                          {r.score}
                          <span className="text-sm font-normal text-neutral-400">/{r.maxScore}</span>
                        </p>
                        <p className="text-xs text-neutral-500">{pct}%</p>
                      </>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
                {r.notes && (
                  <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                    {r.notes}
                  </p>
                )}
                {r.gradedAt && (
                  <p className="mt-2 text-[10px] text-neutral-400">
                    Graded {format(r.gradedAt, "MMM d, yyyy")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
