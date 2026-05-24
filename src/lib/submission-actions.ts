"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import {
  canReviewSubmission,
  canViewSubmission,
} from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { createNotification } from "@/lib/notifications";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { newPublicId } from "@/lib/public-id";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MIME_CATEGORY_MAP: Record<string, RegExp> = {
  image: /^image\//,
  pdf: /^application\/pdf$/,
  doc: /^(application\/msword|application\/vnd\.openxmlformats-officedocument\..*|application\/vnd\.oasis\.opendocument\..*)$/,
  audio: /^audio\//,
  video: /^video\//,
  text: /^text\//,
};

function mimeAllowed(mime: string, categories: string[]): boolean {
  if (categories.length === 0) return true;
  return categories.some((c) => MIME_CATEGORY_MAP[c]?.test(mime) ?? false);
}

async function loadOwnedSubmission(submissionId: number, userId: number) {
  const sub = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      studentUserId: true,
      assignmentId: true,
      assignment: {
        select: {
          dueAt: true,
          title: true,
          maxFileSizeMb: true,
          allowedMimeCategories: true,
        },
      },
    },
  });
  if (!sub) throw new Error("Submission not found.");
  if (sub.studentUserId !== userId) throw new ForbiddenError();
  return sub;
}

export async function saveSubmissionDraftAction(
  submissionId: number,
  text: string,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const sub = await loadOwnedSubmission(submissionId, user.userId);

  await db.submission.update({
    where: { id: sub.id },
    data: { text, status: "DRAFT" },
  });
  revalidatePath("/student/assignments");
  return { ok: true };
}

export async function submitSubmissionAction(
  submissionId: number,
  text: string,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const sub = await loadOwnedSubmission(submissionId, user.userId);

  const now = new Date();
  const isLate = sub.assignment.dueAt ? now.getTime() > sub.assignment.dueAt.getTime() : false;

  await db.submission.update({
    where: { id: sub.id },
    data: {
      text,
      status: "SUBMITTED",
      submittedAt: now,
      // Indicate lateness in feedback-less metadata. We don't have a dedicated "late" status —
      // the comparison submittedAt > dueAt is the source of truth, used by the UI.
    },
  });

  void isLate;
  revalidatePath("/student/assignments");
  revalidatePath("/leader/submissions");
  revalidatePath("/admin/assignments");
  return { ok: true };
}

export async function uploadSubmissionFileAction(
  submissionId: number,
  formData: FormData,
): Promise<ActionResult & { fileId?: number }> {
  const user = await getCurrentUserOrRedirect();
  const sub = await loadOwnedSubmission(submissionId, user.userId);

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  // Validate against assignment constraints.
  const maxMb = sub.assignment.maxFileSizeMb;
  if (maxMb && file.size > maxMb * 1024 * 1024) {
    return { ok: false, error: `File exceeds ${maxMb} MB.` };
  }
  if (!mimeAllowed(file.type, sub.assignment.allowedMimeCategories)) {
    return { ok: false, error: `File type ${file.type} not allowed.` };
  }

  const publicId = newPublicId();
  const key = buildStorageKey({
    bucket: "submissions",
    publicId,
    originalName: file.name,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const put = await getStorage().put(key, buffer, { mime: file.type });

  const created = await db.submissionFile.create({
    data: {
      submissionId: sub.id,
      originalName: file.name,
      storagePath: put.path,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
    select: { id: true },
  });

  revalidatePath("/student/assignments");
  return { ok: true, fileId: created.id };
}

export async function removeSubmissionFileAction(
  fileId: number,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const file = await db.submissionFile.findUnique({
    where: { id: fileId },
    select: {
      storagePath: true,
      submission: { select: { studentUserId: true } },
    },
  });
  if (!file) return { ok: false, error: "File not found." };
  if (file.submission.studentUserId !== user.userId) throw new ForbiddenError();

  await getStorage().delete(file.storagePath).catch(() => undefined);
  await db.submissionFile.delete({ where: { id: fileId } });
  revalidatePath("/student/assignments");
  return { ok: true };
}

const reviewSchema = z.object({
  feedback: z.string().max(20000),
});

export async function reviewSubmissionAction(
  submissionId: number,
  feedback: string,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canReviewSubmission(user, submissionId))) throw new ForbiddenError();
  if (!(await canViewSubmission(user, submissionId))) throw new ForbiddenError();

  const parsed = reviewSchema.safeParse({ feedback });
  if (!parsed.success) return { ok: false, error: "Invalid feedback." };

  const updated = await db.submission.update({
    where: { id: submissionId },
    data: {
      feedback: parsed.data.feedback,
      reviewedAt: new Date(),
      reviewedById: user.userId,
      status: "REVIEWED",
    },
    select: {
      id: true,
      studentUserId: true,
      assignment: { select: { id: true, title: true } },
    },
  });

  await createNotification({
    userId: updated.studentUserId,
    type: "SUBMISSION_REVIEWED",
    title: `Feedback ready on "${updated.assignment.title}"`,
    link: `/student/assignments/${updated.assignment.id}`,
  });

  revalidatePath("/leader/submissions");
  revalidatePath("/admin/assignments");
  revalidatePath("/student/assignments");
  return { ok: true };
}
