import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth(async (_request, user) => {
  const record = await db.user.findUnique({
    where: { id: user.userId },
    select: { id: true, name: true, email: true, role: true, avatarPath: true },
  });

  return apiOk({
    user: record,
    scopes: {
      seasonAdminIds: user.seasonAdminIds,
      groupLeaderIds: user.groupLeaderIds,
      activeSeasonId: user.activeSeasonId,
    },
  });
});
