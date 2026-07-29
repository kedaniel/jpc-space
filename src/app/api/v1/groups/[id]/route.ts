import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { canAccessGroup } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/groups/[id]">>(async (_request, user, { params }) => {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError("bad_request", "Invalid group id.", 400);

  if (!(await canAccessGroup(user, id))) {
    return apiError("forbidden", "You don't have access to this.", 403);
  }

  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      seasonId: true,
      season: { select: { code: true, title: true } },
      leaders: {
        select: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      },
      students: {
        select: { studentUser: { select: { id: true, name: true, email: true } } },
        orderBy: { studentUser: { name: "asc" } },
      },
    },
  });
  if (!group) return apiError("not_found", "Group not found.", 404);

  return apiOk({
    id: group.id,
    name: group.name,
    description: group.description,
    seasonId: group.seasonId,
    seasonCode: group.season.code,
    seasonTitle: group.season.title,
    leaders: group.leaders.map((l) => l.user),
    students: group.students.map((s) => s.studentUser),
  });
});
