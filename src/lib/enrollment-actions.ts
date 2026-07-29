"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAdminOfSeason, isSuper } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CURRENT_YEAR = new Date().getFullYear();

const graduateSchema = z.object({
  graduationYear: z.number().int().min(1990).max(CURRENT_YEAR),
});

/**
 * Graduates a student from JPCS (SUPER only): records the graduation year (the
 * alumnus marker), closes out their active enrollment as COMPLETED, and clears
 * activeSeasonId — they're no longer actively in a season. Their role stays
 * STUDENT; graduationYear is what marks them an alumnus and makes them eligible
 * for a later promotion to LEADER/SEASON_ADMIN/MENTOR.
 */
export async function graduateStudentAction(
  studentUserId: number,
  input: { graduationYear: number },
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  const parsed = graduateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Enter a graduation year between 1990 and ${CURRENT_YEAR}.`,
      fieldErrors: { graduationYear: parsed.error.issues[0]?.message ?? "Invalid." },
    };
  }

  const student = await db.user.findFirst({
    where: { id: studentUserId, role: "STUDENT", deletedAt: null },
    select: { id: true, studentProfile: { select: { activeSeasonId: true } } },
  });
  if (!student) return { ok: false, error: "Student not found." };

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: studentUserId },
      data: { graduationYear: parsed.data.graduationYear },
    });

    const activeSeasonId = student.studentProfile?.activeSeasonId ?? null;
    if (activeSeasonId != null) {
      await tx.seasonEnrollment.updateMany({
        where: { studentUserId, seasonId: activeSeasonId, status: "ACTIVE" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.studentProfile.update({
        where: { userId: studentUserId },
        data: { activeSeasonId: null },
      });
    }
  });

  revalidatePath(`/super/students/${studentUserId}`);
  revalidatePath("/super/students");
  revalidatePath("/super/students/alumni");
  return { ok: true };
}

const dropSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal("")),
});

/**
 * Marks a season enrollment as dropped (WITHDRAWN) — the student left without
 * graduating. Surfaces them in the dropped-students pool with the season/year
 * and an optional reason.
 */
export async function dropEnrollmentAction(
  enrollmentId: number,
  input: { reason?: string },
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const enrollment = await db.seasonEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { seasonId: true, studentUserId: true, status: true },
  });
  if (!enrollment) return { ok: false, error: "Enrollment not found." };
  if (!isAdminOfSeason(user, enrollment.seasonId)) throw new ForbiddenError();
  if (enrollment.status !== "ACTIVE") {
    return { ok: false, error: "Only an active enrollment can be dropped." };
  }

  const parsed = dropSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields." };
  }

  await db.seasonEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: "WITHDRAWN",
      droppedAt: new Date(),
      dropReason: parsed.data.reason || null,
    },
  });

  revalidatePath(`/super/students/${enrollment.studentUserId}`);
  revalidatePath(`/admin/students/${enrollment.studentUserId}`);
  revalidatePath("/super/students/dropped");
  revalidatePath("/admin/students/dropped");
  return { ok: true };
}
