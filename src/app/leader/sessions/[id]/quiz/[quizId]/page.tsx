import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { isLeaderInSeason } from "@/lib/rbac";
import { loadQuizWithGrades } from "@/lib/quiz-query";
import { QuizGradeForm } from "@/components/quizzes/quiz-grade-form";

interface PageProps {
  params: Promise<{ id: string; quizId: string }>;
}

export const metadata = { title: "Grade quiz" };

export default async function LeaderQuizGradePage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  const { id, quizId } = await params;
  const sessionId = Number(id);
  const quizIdNum = Number(quizId);

  const quiz = await db.quiz.findUnique({
    where: { id: quizIdNum },
    select: { seasonId: true, sessionId: true },
  });
  if (!quiz || quiz.sessionId !== sessionId) notFound();
  if (!(await isLeaderInSeason(user, quiz.seasonId))) notFound();

  const studentIds = await db.groupStudent
    .findMany({
      where: { group: { seasonId: quiz.seasonId, id: { in: user.groupLeaderIds } } },
      select: { studentUserId: true },
    })
    .then((rows) => rows.map((r) => r.studentUserId));

  const data = await loadQuizWithGrades(quizIdNum, studentIds);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/leader/sessions/${sessionId}`}
          className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-teal-700 hover:underline"
        >
          <ArrowLeft className="size-3" />
          Back to session
        </Link>
        <h1 className="text-2xl font-black text-brand-navy-900">{data.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {data.sessionTitle ? `${data.sessionTitle} · ` : ""}Max score: {data.maxScore}
        </p>
      </div>

      <QuizGradeForm
        quizId={data.id}
        maxScore={data.maxScore}
        initialGrades={data.grades}
      />
    </div>
  );
}
