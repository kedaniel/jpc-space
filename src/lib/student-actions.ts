"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import {
  canEditStudent,
  canViewStudent,
} from "@/lib/auth/permissions";
import { isSuper } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { newPublicId } from "@/lib/public-id";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  university: z.string().max(160).optional().nullable(),
  year: z.string().max(40).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  spiritualBackground: z.string().max(4000).optional().nullable(),
  gifts: z.string().max(2000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  activeSeasonId: z.number().int().optional().nullable(),
});

export interface StudentProfileInput {
  name: string;
  email: string;
  university?: string | null;
  year?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | string | null;
  spiritualBackground?: string | null;
  gifts?: string | null;
  notes?: string | null;
  activeSeasonId?: number | null;
}

export async function createStudentAction(
  input: StudentProfileInput,
): Promise<ActionResult & { studentUserId?: number }> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user) && user.role !== "ADMIN") throw new ForbiddenError();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  // Default temp password — flagged in TODO; production should send invite.
  const tempPassword = "ChangeMe123!";
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      ok: false,
      error: "A user with that email already exists.",
      fieldErrors: { email: "Already in use." },
    };
  }

  const created = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: "STUDENT",
      passwordHash,
      studentProfile: {
        create: {
          activeSeasonId: parsed.data.activeSeasonId ?? null,
          university: parsed.data.university ?? null,
          year: parsed.data.year ?? null,
          phone: parsed.data.phone ?? null,
          dateOfBirth: parsed.data.dateOfBirth ?? null,
          spiritualBackground: parsed.data.spiritualBackground ?? null,
          gifts: parsed.data.gifts ?? null,
          notes: parsed.data.notes ?? null,
        },
      },
    },
    select: { id: true },
  });

  console.log(
    `[student] Created ${parsed.data.email} with temp password ${tempPassword} — change immediately in production.`,
  );

  revalidatePath("/super/students");
  revalidatePath("/admin/students");
  revalidatePath("/mentor/students");
  return { ok: true, studentUserId: created.id };
}

export async function updateStudentProfileAction(
  studentUserId: number,
  input: StudentProfileInput,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canEditStudent(user, studentUserId))) throw new ForbiddenError();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  // Students editing their own profile can't change `notes` (leader-only field) or activeSeasonId.
  const isSelf = user.userId === studentUserId;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: studentUserId },
      data: { name: parsed.data.name, email: parsed.data.email },
    });
    await tx.studentProfile.update({
      where: { userId: studentUserId },
      data: {
        university: parsed.data.university ?? null,
        year: parsed.data.year ?? null,
        phone: parsed.data.phone ?? null,
        dateOfBirth: parsed.data.dateOfBirth ?? null,
        spiritualBackground: parsed.data.spiritualBackground ?? null,
        gifts: parsed.data.gifts ?? null,
        ...(isSelf
          ? {}
          : {
              notes: parsed.data.notes ?? null,
              activeSeasonId: parsed.data.activeSeasonId ?? null,
            }),
      },
    });
  });

  revalidatePath("/super/students");
  revalidatePath("/admin/students");
  revalidatePath("/mentor/students");
  revalidatePath("/student/profile");
  return { ok: true };
}

export async function softDeleteStudentAction(studentUserId: number): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  await db.user.update({
    where: { id: studentUserId },
    data: { deletedAt: new Date() },
  });
  await db.studentProfile.update({
    where: { userId: studentUserId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/super/students");
  redirect("/super/students");
}

export async function uploadStudentPhotoAction(
  studentUserId: number,
  formData: FormData,
): Promise<ActionResult & { photoPath?: string }> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canEditStudent(user, studentUserId))) throw new ForbiddenError();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Photo exceeds 5 MB." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Photo must be an image." };

  const key = buildStorageKey({
    bucket: "photos",
    publicId: newPublicId(),
    originalName: file.name,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const put = await getStorage().put(key, buffer, { mime: file.type });

  await db.studentProfile.update({
    where: { userId: studentUserId },
    data: { photoPath: put.path },
  });

  revalidatePath(`/super/students/${studentUserId}`);
  revalidatePath(`/admin/students/${studentUserId}`);
  return { ok: true, photoPath: put.path };
}

export async function uploadStudentDocumentAction(
  studentUserId: number,
  formData: FormData,
): Promise<ActionResult & { documentId?: number }> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user) && user.role !== "ADMIN") throw new ForbiddenError();
  if (!(await canViewStudent(user, studentUserId))) throw new ForbiddenError();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: "File exceeds 25 MB." };

  const key = buildStorageKey({
    bucket: "documents",
    publicId: newPublicId(),
    originalName: file.name,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const put = await getStorage().put(key, buffer, { mime: file.type });

  const created = await db.studentDocument.create({
    data: {
      studentUserId,
      uploadedById: user.userId,
      originalName: file.name,
      storagePath: put.path,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
    select: { id: true },
  });

  revalidatePath(`/super/students/${studentUserId}`);
  revalidatePath(`/admin/students/${studentUserId}`);
  return { ok: true, documentId: created.id };
}

export async function deleteStudentDocumentAction(documentId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const doc = await db.studentDocument.findUnique({
    where: { id: documentId },
    select: { studentUserId: true, storagePath: true },
  });
  if (!doc) return { ok: false, error: "Document not found." };
  if (!isSuper(user) && user.role !== "ADMIN") throw new ForbiddenError();

  await getStorage().delete(doc.storagePath).catch(() => undefined);
  await db.studentDocument.delete({ where: { id: documentId } });

  revalidatePath(`/super/students/${doc.studentUserId}`);
  revalidatePath(`/admin/students/${doc.studentUserId}`);
  return { ok: true };
}

function zodErrors(err: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}
