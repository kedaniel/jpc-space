import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { isAdminOfSeason } from "@/lib/rbac";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const POST = withApiAuth<RouteContext<"/api/v1/sessions/[id]/check-in-close">>(
  async (_request, user, { params }) => {
    const sessionId = Number((await params).id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return apiError("bad_request", "Invalid session id.", 400);
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: { seasonId: true },
    });
    if (!session) return apiError("not_found", "Session not found.", 404);
    if (!isAdminOfSeason(user, session.seasonId)) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    await db.session.update({
      where: { id: sessionId },
      data: { checkInClosedAt: new Date() },
    });

    return apiOk({ closed: true });
  },
);
