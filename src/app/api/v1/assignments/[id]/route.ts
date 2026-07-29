import { withApiAuth } from "@/lib/api/auth";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { db } from "@/lib/db";
import { canAccessSeason } from "@/lib/auth/permissions";
import { loadAssignmentById } from "@/lib/assignments-query";

export const runtime = "nodejs";

export function OPTIONS() {
  return apiPreflight();
}

export const GET = withApiAuth<RouteContext<"/api/v1/assignments/[id]">>(
  async (_request, user, { params }) => {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return apiError("bad_request", "Invalid assignment id.", 400);

    const assignment = await db.assignment.findFirst({
      where: { id, deletedAt: null },
      select: { seasonId: true },
    });
    if (!assignment) return apiError("not_found", "Assignment not found.", 404);

    if (!(await canAccessSeason(user, assignment.seasonId))) {
      return apiError("forbidden", "You don't have access to this.", 403);
    }

    const detail = await loadAssignmentById(id);

    if (user.role === "STUDENT" && !detail.isAllGroups) {
      const membership = await db.groupStudent.findUnique({
        where: { studentUserId: user.userId },
        select: { groupId: true },
      });
      if (!membership || !detail.groupIds.includes(membership.groupId)) {
        return apiError("forbidden", "You don't have access to this.", 403);
      }
    }

    let mySubmission = null;
    if (user.role === "STUDENT") {
      mySubmission = await db.submission.findUnique({
        where: { assignmentId_studentUserId: { assignmentId: id, studentUserId: user.userId } },
        select: { publicId: true, status: true, submittedAt: true, reviewedAt: true, feedback: true },
      });
    }

    return apiOk({ ...detail, mySubmission });
  },
);
