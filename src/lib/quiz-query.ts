import { db } from "@/lib/db";

export interface QuizSummary {
  id: number;
  title: string;
  maxScore: number;
  sessionId: number | null;
  sessionTitle: string | null;
  sessionDate: Date | null;
  seasonId: number;
  gradedCount: number;
}

export interface QuizWithGrades {
  id: number;
  title: string;
  maxScore: number;
  seasonId: number;
  sessionId: number | null;
  sessionTitle: string | null;
  grades: {
    studentUserId: number;
    studentName: string;
    score: number | null;
    notes: string | null;
    gradedAt: Date | null;
  }[];
}

export interface StudentQuizResult {
  quizId: number;
  title: string;
  maxScore: number;
  score: number | null;
  notes: string | null;
  gradedAt: Date | null;
  sessionTitle: string | null;
  sessionDate: Date | null;
}

export async function listQuizzesForSession(sessionId: number): Promise<QuizSummary[]> {
  const quizzes = await db.quiz.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      maxScore: true,
      sessionId: true,
      seasonId: true,
      session: { select: { title: true, startsAt: true } },
      grades: { select: { id: true } },
    },
  });
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    maxScore: q.maxScore,
    sessionId: q.sessionId,
    sessionTitle: q.session?.title ?? null,
    sessionDate: q.session?.startsAt ?? null,
    seasonId: q.seasonId,
    gradedCount: q.grades.length,
  }));
}

export async function listQuizzesForSeason(seasonId: number): Promise<QuizSummary[]> {
  const quizzes = await db.quiz.findMany({
    where: { seasonId },
    orderBy: [{ session: { startsAt: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      maxScore: true,
      sessionId: true,
      seasonId: true,
      session: { select: { title: true, startsAt: true } },
      grades: { select: { id: true } },
    },
  });
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    maxScore: q.maxScore,
    sessionId: q.sessionId,
    sessionTitle: q.session?.title ?? null,
    sessionDate: q.session?.startsAt ?? null,
    seasonId: q.seasonId,
    gradedCount: q.grades.length,
  }));
}

export async function loadQuizWithGrades(
  quizId: number,
  studentUserIds: number[],
): Promise<QuizWithGrades | null> {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      maxScore: true,
      seasonId: true,
      sessionId: true,
      session: { select: { title: true } },
    },
  });
  if (!quiz) return null;

  const [students, grades] = await Promise.all([
    db.user.findMany({
      where: { id: { in: studentUserIds }, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.quizGrade.findMany({
      where: { quizId, studentUserId: { in: studentUserIds } },
      select: { studentUserId: true, score: true, notes: true, gradedAt: true },
    }),
  ]);

  const gradeMap = new Map(grades.map((g) => [g.studentUserId, g]));

  return {
    id: quiz.id,
    title: quiz.title,
    maxScore: quiz.maxScore,
    seasonId: quiz.seasonId,
    sessionId: quiz.sessionId,
    sessionTitle: quiz.session?.title ?? null,
    grades: students.map((s) => {
      const g = gradeMap.get(s.id);
      return {
        studentUserId: s.id,
        studentName: s.name ?? "",
        score: g?.score ?? null,
        notes: g?.notes ?? null,
        gradedAt: g?.gradedAt ?? null,
      };
    }),
  };
}

export async function listQuizResultsForStudent(
  studentUserId: number,
  seasonId: number,
): Promise<StudentQuizResult[]> {
  const grades = await db.quizGrade.findMany({
    where: {
      studentUserId,
      quiz: { seasonId },
    },
    orderBy: { quiz: { session: { startsAt: "desc" } } },
    select: {
      score: true,
      notes: true,
      gradedAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          session: { select: { title: true, startsAt: true } },
        },
      },
    },
  });
  return grades.map((g) => ({
    quizId: g.quiz.id,
    title: g.quiz.title,
    maxScore: g.quiz.maxScore,
    score: g.score,
    notes: g.notes,
    gradedAt: g.gradedAt,
    sessionTitle: g.quiz.session?.title ?? null,
    sessionDate: g.quiz.session?.startsAt ?? null,
  }));
}
