import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { isSuper, isMentor } from "@/lib/rbac";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth(async (_request, user) => {
  const where =
    isSuper(user) || isMentor(user)
      ? { deletedAt: null }
      : user.role === "ADMIN"
        ? { deletedAt: null, id: { in: user.seasonAdminIds } }
        : user.role === "LEADER"
          ? { deletedAt: null, groups: { some: { leaders: { some: { userId: user.userId } } } } }
          : { deletedAt: null, enrollments: { some: { studentUserId: user.userId } } };

  const seasons = await db.season.findMany({
    where,
    orderBy: [{ year: "desc" }, { title: "asc" }],
    select: {
      id: true,
      code: true,
      title: true,
      program: true,
      year: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  return apiOk({ seasons });
});
