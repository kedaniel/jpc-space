import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { canAccessSeason } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/seasons/[id]">>(async (_request, user, { params }) => {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError("bad_request", "Invalid season id.", 400);

  if (!(await canAccessSeason(user, id))) {
    return apiError("forbidden", "You don't have access to this.", 403);
  }

  const season = await db.season.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      code: true,
      title: true,
      program: true,
      year: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { sessions: true, enrollments: true } },
      groups: {
        // Students may only see their own group.
        where: user.role === "STUDENT" ? { students: { some: { studentUserId: user.userId } } } : {},
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
          leaders: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!season) return apiError("not_found", "Season not found.", 404);

  return apiOk({
    id: season.id,
    code: season.code,
    title: season.title,
    program: season.program,
    year: season.year,
    description: season.description,
    status: season.status,
    startDate: season.startDate,
    endDate: season.endDate,
    sessionCount: season._count.sessions,
    studentCount: season._count.enrollments,
    groups: season.groups.map((g) => ({
      id: g.id,
      name: g.name,
      studentCount: g._count.students,
      leaderNames: g.leaders.map((l) => l.user.name).filter((n): n is string => Boolean(n)),
    })),
  });
});
