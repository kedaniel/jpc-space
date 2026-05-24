"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { canCreateAssignment, canEditAssignment } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { createNotificationsBulk } from "@/lib/notifications";
import { newPublicId } from "@/lib/public-id";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const assignmentSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(20000).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  sessionId: z.number().int().nullable().optional(),
  maxFileSizeMb: z.number().int().min(1).max(100).optional().nullable(),
  allowedMimeCategories: z.array(z.enum(["image", "pdf", "doc", "audio", "video", "text"])).default([]),
});

export interface AssignmentInput {
  title: string;
  description?: string | null;
  dueAt?: Date | string | null;
  sessionId?: number | null;
  maxFileSizeMb?: number | null;
  allowedMimeCategories?: string[];
  isAllGroups: boolean;
  groupIds: number[];
}

export async function createAssignmentAction(
  seasonId: number,
  input: AssignmentInput,
): Promise<ActionResult & { assignmentId?: number }> {
  const user = await getCurrentUserOrRedirect();
  if (!canCreateAssignment(user, seasonId)) throw new ForbiddenError();

  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  const assignment = await db.$transaction(async (tx) => {
    const a = await tx.assignment.create({
      data: {
        seasonId,
        sessionId: parsed.data.sessionId ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueAt: parsed.data.dueAt ?? null,
        isAllGroups: input.isAllGroups,
        maxFileSizeMb: parsed.data.maxFileSizeMb ?? null,
        allowedMimeCategories: parsed.data.allowedMimeCategories,
        createdById: user.userId,
        updatedById: user.userId,
      },
      select: { id: true },
    });
    if (!input.isAllGroups && input.groupIds.length > 0) {
      await tx.assignmentTarget.createMany({
        data: input.groupIds.map((groupId) => ({ assignmentId: a.id, groupId })),
        skipDuplicates: true,
      });
    }
    return a;
  });

  // Fan out notifications to targeted students.
  const studentIds = await targetedStudentIds(seasonId, input.isAllGroups, input.groupIds);
  if (studentIds.length > 0) {
    await createNotificationsBulk(studentIds, {
      type: "ASSIGNMENT_CREATED",
      title: `New assignment: ${parsed.data.title}`,
      body: parsed.data.dueAt
        ? `Due ${new Date(parsed.data.dueAt).toLocaleString()}`
        : undefined,
      link: `/student/assignments/${assignment.id}`,
    });
  }

  revalidatePath("/admin/season");
  revalidatePath("/admin/assignments");
  revalidatePath("/student/assignments");
  return { ok: true, assignmentId: assignment.id };
}

export async function updateAssignmentAction(
  assignmentId: number,
  input: AssignmentInput,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canEditAssignment(user, assignmentId))) throw new ForbiddenError();

  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  await db.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        sessionId: parsed.data.sessionId ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueAt: parsed.data.dueAt ?? null,
        isAllGroups: input.isAllGroups,
        maxFileSizeMb: parsed.data.maxFileSizeMb ?? null,
        allowedMimeCategories: parsed.data.allowedMimeCategories,
        updatedById: user.userId,
      },
    });
    await tx.assignmentTarget.deleteMany({ where: { assignmentId } });
    if (!input.isAllGroups && input.groupIds.length > 0) {
      await tx.assignmentTarget.createMany({
        data: input.groupIds.map((groupId) => ({ assignmentId, groupId })),
      });
    }
  });

  revalidatePath("/admin/season");
  revalidatePath("/admin/assignments");
  return { ok: true };
}

export async function softDeleteAssignmentAction(
  assignmentId: number,
): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canEditAssignment(user, assignmentId))) throw new ForbiddenError();

  const a = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { season: { select: { code: true } } },
  });

  await db.assignment.update({
    where: { id: assignmentId },
    data: { deletedAt: new Date(), updatedById: user.userId },
  });

  revalidatePath("/admin/assignments");
  if (a?.season.code) {
    redirect(`/admin/season/${a.season.code}/assignments`);
  }
  redirect("/admin/season");
}

async function targetedStudentIds(
  seasonId: number,
  isAllGroups: boolean,
  groupIds: number[],
): Promise<number[]> {
  if (isAllGroups) {
    const enrollments = await db.seasonEnrollment.findMany({
      where: { seasonId, status: "ACTIVE" },
      select: { studentUserId: true },
    });
    return Array.from(new Set(enrollments.map((e) => e.studentUserId)));
  }
  if (groupIds.length === 0) return [];
  const members = await db.groupStudent.findMany({
    where: { groupId: { in: groupIds } },
    select: { studentUserId: true },
  });
  return Array.from(new Set(members.map((m) => m.studentUserId)));
}

export async function ensureDraftSubmission(
  assignmentId: number,
  studentUserId: number,
): Promise<{ id: number; publicId: string }> {
  const existing = await db.submission.findUnique({
    where: { assignmentId_studentUserId: { assignmentId, studentUserId } },
    select: { id: true, publicId: true },
  });
  if (existing) return existing;
  return db.submission.create({
    data: {
      assignmentId,
      studentUserId,
      publicId: newPublicId(),
      status: "DRAFT",
    },
    select: { id: true, publicId: true },
  });
}

function zodErrors(err: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}
