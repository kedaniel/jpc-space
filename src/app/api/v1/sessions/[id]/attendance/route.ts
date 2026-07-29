import { z } from "zod";

import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { loadAttendanceRoster } from "@/lib/sessions-query";
import { flagLowAttendance } from "@/lib/attendance-notifications";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/sessions/[id]/attendance">>(
  async (_request, user, { params }) => {
    const sessionId = Number((await params).id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return apiError("bad_request", "Invalid session id.", 400);
    }

    if (!(await canMarkAttendance(user, sessionId))) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    const roster = await loadAttendanceRoster(sessionId);
    return apiOk({ roster });
  },
);

const entrySchema = z.object({
  studentUserId: z.number().int(),
  status: z.enum([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
  notes: z.string().max(500).optional().nullable(),
  lateMinutes: z.number().int().min(0).max(600).optional().nullable(),
});
const bodySchema = z.object({ entries: z.array(entrySchema) });

export const POST = withApiAuth<RouteContext<"/api/v1/sessions/[id]/attendance">>(
  async (request, user, { params }) => {
    const sessionId = Number((await params).id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return apiError("bad_request", "Invalid session id.", 400);
    }

    if (!(await canMarkAttendance(user, sessionId))) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return apiError("bad_request", "Invalid attendance entries.", 400);

    await db.$transaction(
      parsed.data.entries.map((e) =>
        db.attendance.upsert({
          where: { sessionId_studentUserId: { sessionId, studentUserId: e.studentUserId } },
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

    await flagLowAttendance(sessionId, parsed.data.entries);

    return apiOk({ saved: parsed.data.entries.length });
  },
);
