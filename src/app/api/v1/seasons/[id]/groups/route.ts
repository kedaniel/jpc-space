import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { canAccessSeason } from "@/lib/auth/permissions";
import { listGroupsForSeason } from "@/lib/groups-query";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/seasons/[id]/groups">>(
  async (_request, user, { params }) => {
    const seasonId = Number((await params).id);
    if (!Number.isInteger(seasonId) || seasonId <= 0) {
      return apiError("bad_request", "Invalid season id.", 400);
    }

    if (!(await canAccessSeason(user, seasonId))) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    const groups = await listGroupsForSeason(seasonId, {
      onlyStudentUserId: user.role === "STUDENT" ? user.userId : undefined,
    });
    return apiOk({ groups });
  },
);
