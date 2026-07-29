"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { flagLowAttendance } from "@/lib/attendance-notifications";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const entrySchema = z.object({
  studentUserId: z.number().int(),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.LATE,
  ]),
  notes: z.string().max(500).optional().nullable(),
  lateMinutes: z.number().int().min(0).max(600).optional().nullable(),
});

export interface AttendanceEntryInput {
  studentUserId: number;
  status: AttendanceStatus;
  notes?: string | null;
  lateMinutes?: number | null;
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
          lateMinutes: e.status === AttendanceStatus.LATE ? (e.lateMinutes ?? null) : null,
          markedById: user.userId,
          markedAt: new Date(),
        },
        create: {
          sessionId,
          studentUserId: e.studentUserId,
          status: e.status,
          notes: e.notes ?? null,
          lateMinutes: e.status === AttendanceStatus.LATE ? (e.lateMinutes ?? null) : null,
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

export type CheckInResult =
  | { ok: true; status: "PRESENT" | "LATE"; minutesLate: number }
  | {
      ok: false;
      error:
        | "invalid_token"
        | "not_open"
        | "closed"
        | "not_enrolled"
        | "already_checked_in";
      currentStatus?: AttendanceStatus;
    };

export async function checkInByTokenAction(token: string): Promise<CheckInResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      startsAt: true,
      seasonId: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
    },
  });

  if (!session) return { ok: false, error: "invalid_token" };
  if (!session.checkInOpenAt) return { ok: false, error: "not_open" };
  if (session.checkInClosedAt) return { ok: false, error: "closed" };

  const now = new Date();
  if (now.getTime() - session.checkInOpenAt.getTime() > 3 * 60 * 60 * 1000) {
    return { ok: false, error: "closed" };
  }

  const enrollment = await db.seasonEnrollment.findUnique({
    where: {
      studentUserId_seasonId: {
        studentUserId: user.userId,
        seasonId: session.seasonId,
      },
    },
    select: { status: true },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    return { ok: false, error: "not_enrolled" };
  }

  const existing = await db.attendance.findUnique({
    where: {
      sessionId_studentUserId: {
        sessionId: session.id,
        studentUserId: user.userId,
      },
    },
    select: { checkedInAt: true, status: true },
  });
  if (existing?.checkedInAt) {
    return {
      ok: false,
      error: "already_checked_in",
      currentStatus: existing.status,
    };
  }

  const minutesLate = Math.max(
    0,
    Math.floor((now.getTime() - session.checkInOpenAt.getTime()) / 60_000),
  );
  const status: "PRESENT" | "LATE" = minutesLate > 0 ? "LATE" : "PRESENT";

  await db.attendance.upsert({
    where: {
      sessionId_studentUserId: {
        sessionId: session.id,
        studentUserId: user.userId,
      },
    },
    create: {
      sessionId: session.id,
      studentUserId: user.userId,
      status,
      checkedInAt: now,
      lateMinutes: status === "LATE" ? minutesLate : null,
      markedById: user.userId,
      markedAt: now,
    },
    update: {
      status,
      checkedInAt: now,
      lateMinutes: status === "LATE" ? minutesLate : null,
    },
  });

  revalidatePath(`/leader/sessions/${session.id}`);
  revalidatePath(`/student/dashboard`);
  return { ok: true, status, minutesLate };
}

const overrideSchema = z.object({
  studentUserId: z.number().int(),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.LATE,
  ]),
  notes: z.string().max(500).optional().nullable(),
  lateMinutes: z.number().int().min(0).max(600).optional().nullable(),
});

export async function manualOverrideAction(
  sessionId: number,
  input: z.infer<typeof overrideSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canMarkAttendance(user, sessionId))) throw new ForbiddenError();

  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  await db.attendance.upsert({
    where: {
      sessionId_studentUserId: {
        sessionId,
        studentUserId: parsed.data.studentUserId,
      },
    },
    create: {
      sessionId,
      studentUserId: parsed.data.studentUserId,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      lateMinutes:
        parsed.data.status === AttendanceStatus.LATE ? (parsed.data.lateMinutes ?? null) : null,
      markedById: user.userId,
      markedAt: new Date(),
    },
    update: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      lateMinutes:
        parsed.data.status === AttendanceStatus.LATE ? (parsed.data.lateMinutes ?? null) : null,
      markedById: user.userId,
      markedAt: new Date(),
    },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  return { ok: true };
}
