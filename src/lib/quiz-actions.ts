"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { canEditSeason } from "@/lib/auth/permissions";
import { createNotification } from "@/lib/notifications";

const createQuizSchema = z.object({
  sessionId: z.number().int().positive(),
  seasonId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  maxScore: z.number().int().min(1).max(1000),
});

export async function createQuizAction(
  sessionId: number,
  seasonId: number,
  title: string,
  maxScore: number,
): Promise<{ error?: string }> {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  if (!canEditSeason(user, seasonId)) return { error: "Unauthorized" };

  const parsed = createQuizSchema.safeParse({ sessionId, seasonId, title, maxScore });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.quiz.create({
    data: {
      sessionId: parsed.data.sessionId,
      seasonId: parsed.data.seasonId,
      title: parsed.data.title,
      maxScore: parsed.data.maxScore,
      createdById: user.userId,
    },
  });

  revalidatePath(`/admin/season`);
  return {};
}

export async function deleteQuizAction(quizId: number): Promise<{ error?: string }> {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);

  const quiz = await db.quiz.findUnique({ where: { id: quizId }, select: { seasonId: true } });
  if (!quiz) return { error: "Not found" };
  if (!canEditSeason(user, quiz.seasonId)) return { error: "Unauthorized" };

  await db.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/admin/season`);
  return {};
}

const gradeEntrySchema = z.object({
  studentUserId: z.number().int().positive(),
  score: z.number().int().min(0).nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function saveQuizGradesAction(
  quizId: number,
  grades: { studentUserId: number; score: number | null; notes: string | null }[],
): Promise<{ error?: string }> {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER", "ADMIN", "SUPER"]);

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: { seasonId: true, title: true },
  });
  if (!quiz) return { error: "Quiz not found" };

  const parsed = z.array(gradeEntrySchema).safeParse(grades);
  if (!parsed.success) return { error: "Invalid grade data" };

  const now = new Date();
  const newlyGraded: number[] = [];

  for (const g of parsed.data) {
    if (g.score === null) continue;

    const existing = await db.quizGrade.findUnique({
      where: { quizId_studentUserId: { quizId, studentUserId: g.studentUserId } },
      select: { gradedAt: true },
    });

    const wasUngraded = !existing?.gradedAt;

    await db.quizGrade.upsert({
      where: { quizId_studentUserId: { quizId, studentUserId: g.studentUserId } },
      create: {
        quizId,
        studentUserId: g.studentUserId,
        score: g.score,
        notes: g.notes ?? null,
        gradedById: user.userId,
        gradedAt: now,
      },
      update: {
        score: g.score,
        notes: g.notes ?? null,
        gradedById: user.userId,
        gradedAt: now,
      },
    });

    if (wasUngraded) newlyGraded.push(g.studentUserId);
  }

  // Send QUIZ_GRADED notifications only for newly graded students.
  for (const studentUserId of newlyGraded) {
    await createNotification({
      userId: studentUserId,
      type: "QUIZ_GRADED",
      title: `Quiz graded: ${quiz.title}`,
      body: `Your quiz has been graded. Check your quiz results.`,
      link: `/student/quizzes`,
    });
  }

  revalidatePath(`/leader/sessions`);
  revalidatePath(`/leader/quizzes`);
  return {};
}
