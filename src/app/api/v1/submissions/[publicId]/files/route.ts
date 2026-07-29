import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/auth/errors";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { newPublicId } from "@/lib/public-id";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

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

export const POST = withApiAuth<RouteContext<"/api/v1/submissions/[publicId]/files">>(
  async (request, user, { params }) => {
    const { publicId } = await params;
    const sub = await db.submission.findUnique({
      where: { publicId },
      select: {
        id: true,
        studentUserId: true,
        assignment: { select: { maxFileSizeMb: true, allowedMimeCategories: true } },
      },
    });
    if (!sub) return apiError("not_found", "Submission not found.", 404);
    if (sub.studentUserId !== user.userId) throw new ForbiddenError();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) return apiError("bad_request", "No file provided.", 400);

    const maxMb = sub.assignment.maxFileSizeMb;
    if (maxMb && file.size > maxMb * 1024 * 1024) {
      return apiError("file_too_large", `File exceeds ${maxMb} MB.`, 400);
    }
    if (!mimeAllowed(file.type, sub.assignment.allowedMimeCategories)) {
      return apiError("mime_not_allowed", `File type ${file.type} not allowed.`, 400);
    }

    const key = buildStorageKey({ bucket: "submissions", publicId: newPublicId(), originalName: file.name });
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
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
    });

    return apiOk({ file: created }, 201);
  },
);

export const DELETE = withApiAuth<RouteContext<"/api/v1/submissions/[publicId]/files">>(
  async (request, user, { params }) => {
    const { publicId } = await params;
    const fileId = Number(new URL(request.url).searchParams.get("fileId"));
    if (!Number.isInteger(fileId) || fileId <= 0) {
      return apiError("bad_request", "Invalid fileId.", 400);
    }

    const file = await db.submissionFile.findUnique({
      where: { id: fileId },
      select: { storagePath: true, submission: { select: { publicId: true, studentUserId: true } } },
    });
    if (!file || file.submission.publicId !== publicId) {
      return apiError("not_found", "File not found.", 404);
    }
    if (file.submission.studentUserId !== user.userId) throw new ForbiddenError();

    await getStorage().delete(file.storagePath).catch(() => undefined);
    await db.submissionFile.delete({ where: { id: fileId } });

    return apiOk({ deleted: true });
  },
);
