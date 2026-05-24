"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { NoteVisibility } from "@/generated/prisma/enums";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { canWriteNote } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { createNotificationsBulk } from "@/lib/notifications";

export type ActionResult =
  | { ok: true; noteId?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  body: z.string().min(2).max(20000),
  visibility: z.enum([NoteVisibility.LEADERS, NoteVisibility.MENTORS, NoteVisibility.ADMINS]),
  followUpFlagged: z.boolean().default(false),
  seasonId: z.number().int().nullable(),
});

export interface NoteInput {
  body: string;
  visibility: NoteVisibility;
  followUpFlagged?: boolean;
  seasonId?: number | null;
}

export async function createNoteAction(
  studentUserId: number,
  input: NoteInput,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canWriteNote(user, studentUserId))) throw new ForbiddenError();

  const parsed = schema.safeParse({
    body: input.body,
    visibility: input.visibility,
    followUpFlagged: input.followUpFlagged ?? false,
    seasonId: input.seasonId ?? null,
  });
  if (!parsed.success) return zodErrors(parsed.error);

  // Default the season to the student's current active season if not provided.
  let seasonId = parsed.data.seasonId;
  if (seasonId == null) {
    const profile = await db.studentProfile.findUnique({
      where: { userId: studentUserId },
      select: { activeSeasonId: true },
    });
    seasonId = profile?.activeSeasonId ?? null;
  }

  const created = await db.engagementNote.create({
    data: {
      studentUserId,
      authorUserId: user.userId,
      seasonId,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      followUpFlagged: parsed.data.followUpFlagged,
    },
    select: { id: true },
  });

  if (parsed.data.followUpFlagged && seasonId) {
    const admins = await db.seasonAdmin.findMany({
      where: { seasonId },
      select: { userId: true },
    });
    const student = await db.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    });
    if (admins.length > 0) {
      await createNotificationsBulk(
        admins.map((a) => a.userId),
        {
          type: "MENTOR_FOLLOWUP",
          title: `Follow-up flagged for ${student?.name ?? "a student"}`,
          body: parsed.data.body.slice(0, 140),
          link: `/admin/students/${studentUserId}`,
        },
      );
    }
  }

  revalidatePath(`/super/students/${studentUserId}`);
  revalidatePath(`/admin/students/${studentUserId}`);
  revalidatePath(`/mentor/students/${studentUserId}`);
  revalidatePath(`/mentor/notes`);
  return { ok: true, noteId: created.id };
}

export async function updateNoteAction(
  noteId: number,
  body: string,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const note = await db.engagementNote.findUnique({
    where: { id: noteId },
    select: { authorUserId: true, studentUserId: true },
  });
  if (!note) return { ok: false, error: "Note not found." };
  if (note.authorUserId !== user.userId) throw new ForbiddenError();

  await db.engagementNote.update({
    where: { id: noteId },
    data: { body },
  });
  revalidatePath(`/super/students/${note.studentUserId}`);
  revalidatePath(`/admin/students/${note.studentUserId}`);
  revalidatePath(`/mentor/students/${note.studentUserId}`);
  revalidatePath(`/mentor/notes`);
  return { ok: true };
}

export async function deleteNoteAction(noteId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const note = await db.engagementNote.findUnique({
    where: { id: noteId },
    select: { authorUserId: true, studentUserId: true },
  });
  if (!note) return { ok: false, error: "Note not found." };
  if (note.authorUserId !== user.userId) throw new ForbiddenError();

  await db.engagementNote.delete({ where: { id: noteId } });
  revalidatePath(`/super/students/${note.studentUserId}`);
  revalidatePath(`/admin/students/${note.studentUserId}`);
  revalidatePath(`/mentor/students/${note.studentUserId}`);
  revalidatePath(`/mentor/notes`);
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
