import { z } from "zod";

import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { canViewSubmission } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

async function loadSubmissionForApi(publicId: string) {
  return db.submission.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      status: true,
      text: true,
      feedback: true,
      submittedAt: true,
      reviewedAt: true,
      assignmentId: true,
      studentUserId: true,
      assignment: {
        select: { title: true, dueAt: true, description: true, seasonId: true, season: { select: { code: true } } },
      },
      studentUser: { select: { name: true, email: true } },
      files: {
        select: { id: true, originalName: true, storagePath: true, mimeType: true, sizeBytes: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });
}

export const GET = withApiAuth<RouteContext<"/api/v1/submissions/[publicId]">>(
  async (_request, user, { params }) => {
    const { publicId } = await params;
    const sub = await loadSubmissionForApi(publicId);
    if (!sub) return apiError("not_found", "Submission not found.", 404);

    if (!(await canViewSubmission(user, sub.id))) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    return apiOk({
      id: sub.id,
      publicId: sub.publicId,
      status: sub.status,
      text: sub.text,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt,
      reviewedAt: sub.reviewedAt,
      assignmentId: sub.assignmentId,
      assignmentTitle: sub.assignment.title,
      assignmentDueAt: sub.assignment.dueAt,
      assignmentDescription: sub.assignment.description,
      seasonCode: sub.assignment.season.code,
      studentUserId: sub.studentUserId,
      studentName: sub.studentUser.name,
      studentEmail: sub.studentUser.email,
      files: sub.files,
    });
  },
);

const bodySchema = z.object({
  text: z.string(),
  submit: z.boolean().optional(),
});

export const PATCH = withApiAuth<RouteContext<"/api/v1/submissions/[publicId]">>(
  async (request, user, { params }) => {
    const { publicId } = await params;
    const sub = await db.submission.findUnique({
      where: { publicId },
      select: { id: true, studentUserId: true, assignment: { select: { dueAt: true } } },
    });
    if (!sub) return apiError("not_found", "Submission not found.", 404);
    if (sub.studentUserId !== user.userId) throw new ForbiddenError();

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return apiError("bad_request", "Invalid submission body.", 400);

    if (parsed.data.submit) {
      const now = new Date();
      await db.submission.update({
        where: { id: sub.id },
        data: { text: parsed.data.text, status: "SUBMITTED", submittedAt: now },
      });
    } else {
      await db.submission.update({
        where: { id: sub.id },
        data: { text: parsed.data.text, status: "DRAFT" },
      });
    }

    return apiOk({ saved: true, submitted: Boolean(parsed.data.submit) });
  },
);
