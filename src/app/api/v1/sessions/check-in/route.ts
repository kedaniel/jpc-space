import { z } from "zod";

import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

const bodySchema = z.object({ token: z.string().min(1) });

export const POST = withApiAuth(async (request, user) => {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return apiError("bad_request", "Missing check-in token.", 400);

  const session = await db.session.findUnique({
    where: { checkInToken: parsed.data.token },
    select: { id: true, seasonId: true, checkInOpenAt: true, checkInClosedAt: true },
  });
  if (!session) return apiError("invalid_token", "Check-in token is invalid.", 404);
  if (!session.checkInOpenAt) return apiError("not_open", "Check-in is not open yet.", 409);
  if (session.checkInClosedAt) return apiError("closed", "Check-in has closed.", 409);

  const now = new Date();
  if (now.getTime() - session.checkInOpenAt.getTime() > 3 * 60 * 60 * 1000) {
    return apiError("closed", "Check-in has closed.", 409);
  }

  const enrollment = await db.seasonEnrollment.findUnique({
    where: { studentUserId_seasonId: { studentUserId: user.userId, seasonId: session.seasonId } },
    select: { status: true },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    return apiError("not_enrolled", "You're not enrolled in this season.", 403);
  }

  const existing = await db.attendance.findUnique({
    where: { sessionId_studentUserId: { sessionId: session.id, studentUserId: user.userId } },
    select: { checkedInAt: true, status: true },
  });
  if (existing?.checkedInAt) {
    return apiError("already_checked_in", "Already checked in.", 409);
  }

  const minutesLate = Math.max(
    0,
    Math.floor((now.getTime() - session.checkInOpenAt.getTime()) / 60_000),
  );
  const status: "PRESENT" | "LATE" = minutesLate > 0 ? "LATE" : "PRESENT";

  await db.attendance.upsert({
    where: { sessionId_studentUserId: { sessionId: session.id, studentUserId: user.userId } },
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

  return apiOk({ status, minutesLate });
});
