import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { canAccessSeason, canMarkAttendance } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/sessions/[id]">>(async (_request, user, { params }) => {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError("bad_request", "Invalid session id.", 400);

  const session = await db.session.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      youtubeUrl: true,
      recurrenceGroupId: true,
      seasonId: true,
      season: { select: { code: true, title: true } },
      checkInOpenAt: true,
      checkInClosedAt: true,
    },
  });
  if (!session) return apiError("not_found", "Session not found.", 404);

  if (!(await canAccessSeason(user, session.seasonId))) {
    return apiError("forbidden", "You don't have access to this.", 403);
  }

  const myAttendance =
    user.role === "STUDENT"
      ? await db.attendance.findUnique({
          where: { sessionId_studentUserId: { sessionId: id, studentUserId: user.userId } },
          select: { status: true, notes: true, lateMinutes: true, checkedInAt: true },
        })
      : null;

  return apiOk({
    id: session.id,
    title: session.title,
    description: session.description,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    location: session.location,
    youtubeUrl: session.youtubeUrl,
    recurrenceGroupId: session.recurrenceGroupId,
    seasonId: session.seasonId,
    seasonCode: session.season.code,
    seasonTitle: session.season.title,
    checkInOpen: Boolean(session.checkInOpenAt) && !session.checkInClosedAt,
    myAttendance,
    canMarkAttendance: await canMarkAttendance(user, id),
  });
});
