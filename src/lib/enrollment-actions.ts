"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAdminOfSeason } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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
