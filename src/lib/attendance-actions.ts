"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { createNotificationsBulk } from "@/lib/notifications";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const entrySchema = z.object({
  studentUserId: z.number().int(),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.EXCUSED,
    AttendanceStatus.LATE,
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export interface AttendanceEntryInput {
  studentUserId: number;
  status: AttendanceStatus;
  notes?: string | null;
}

export async function saveAttendanceAction(
  sessionId: number,
  entries: AttendanceEntryInput[],
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canMarkAttendance(user, sessionId))) throw new ForbiddenError();

  const parsed = z.array(entrySchema).safeParse(entries);
  if (!parsed.success) return { ok: false, error: "Invalid attendance entries." };

  await db.$transaction(
    parsed.data.map((e) =>
      db.attendance.upsert({
        where: {
          sessionId_studentUserId: {
            sessionId,
            studentUserId: e.studentUserId,
          },
        },
        update: {
          status: e.status,
          notes: e.notes ?? null,
          markedById: user.userId,
          markedAt: new Date(),
        },
        create: {
          sessionId,
          studentUserId: e.studentUserId,
          status: e.status,
          notes: e.notes ?? null,
          markedById: user.userId,
        },
      }),
    ),
  );

  await flagLowAttendance(sessionId, parsed.data);

  revalidatePath("/admin/season");
  revalidatePath("/admin/calendar");
  revalidatePath("/leader/calendar");
  revalidatePath("/leader/dashboard");
  return { ok: true };
}

/** If any student has 3+ consecutive ABSENTs across past sessions in this season, flag. */
async function flagLowAttendance(
  sessionId: number,
  entries: { studentUserId: number; status: AttendanceStatus }[],
): Promise<void> {
  const absentStudents = entries
    .filter((e) => e.status === AttendanceStatus.ABSENT)
    .map((e) => e.studentUserId);
  if (absentStudents.length === 0) return;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { id: true, seasonId: true, startsAt: true },
  });
  if (!session) return;

  for (const studentUserId of absentStudents) {
    const recent = await db.attendance.findMany({
      where: {
        studentUserId,
        session: { seasonId: session.seasonId, startsAt: { lte: session.startsAt } },
      },
      orderBy: { session: { startsAt: "desc" } },
      take: 3,
      select: { status: true },
    });
    if (recent.length < 3) continue;
    if (!recent.every((r) => r.status === AttendanceStatus.ABSENT)) continue;

    const membership = await db.groupStudent.findUnique({
      where: { studentUserId },
      select: { groupId: true },
    });
    if (!membership) continue;

    const leaders = await db.groupLeader.findMany({
      where: { groupId: membership.groupId },
      select: { userId: true },
    });
    const admins = await db.seasonAdmin.findMany({
      where: { seasonId: session.seasonId },
      select: { userId: true },
    });
    const recipientIds = Array.from(
      new Set([...leaders.map((l) => l.userId), ...admins.map((a) => a.userId)]),
    );
    const student = await db.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    });
    await createNotificationsBulk(recipientIds, {
      type: "LOW_ATTENDANCE_FLAG",
      title: `${student?.name ?? "A student"} has 3 consecutive absences`,
      body: "Consider reaching out for a check-in.",
      link: `/admin/students/${studentUserId}`,
    });
  }
}
