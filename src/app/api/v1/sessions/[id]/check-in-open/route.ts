import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { isAdminOfSeason } from "@/lib/rbac";
import { newPublicId } from "@/lib/public-id";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const POST = withApiAuth<RouteContext<"/api/v1/sessions/[id]/check-in-open">>(
  async (_request, user, { params }) => {
    const sessionId = Number((await params).id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return apiError("bad_request", "Invalid session id.", 400);
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: { seasonId: true, checkInToken: true },
    });
    if (!session) return apiError("not_found", "Session not found.", 404);
    if (!isAdminOfSeason(user, session.seasonId)) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    const checkInToken = session.checkInToken ?? newPublicId();
    await db.session.update({
      where: { id: sessionId },
      data: { checkInToken, checkInOpenAt: new Date(), checkInClosedAt: null },
    });

    return apiOk({ checkInToken });
  },
);
