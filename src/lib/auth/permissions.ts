import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/enums";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import {
  type SessionUser,
  isSuper,
  isMentor,
  isAdminOfSeason,
  isLeaderOfGroup,
  canReadAllStudents,
  canManageUsers,
} from "@/lib/rbac";

export {
  isSuper,
  isMentor,
  isAdminOfSeason,
  isLeaderOfGroup,
  canReadAllStudents,
  canManageUsers,
};
export type { SessionUser };

export function requireRole(
  user: SessionUser | null,
  allowedRoles: readonly UserRole[],
): asserts user is SessionUser {
  if (!user) throw new UnauthorizedError();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Role ${user.role} is not permitted (need one of ${allowedRoles.join(", ")})`,
    );
  }
}

export function canCreateSeason(user: SessionUser): boolean {
  return isSuper(user);
}

export function canEditSeason(user: SessionUser, seasonId: number): boolean {
  return isAdminOfSeason(user, seasonId);
}

export async function canAccessSeason(
  user: SessionUser,
  seasonId: number,
): Promise<boolean> {
  if (isSuper(user) || isMentor(user)) return true;
  if (isAdminOfSeason(user, seasonId)) return true;

  if (user.role === "LEADER") {
    if (user.groupLeaderIds.length === 0) return false;
    const groupInSeason = await db.group.findFirst({
      where: { seasonId, id: { in: user.groupLeaderIds } },
      select: { id: true },
    });
    return groupInSeason !== null;
  }

  if (user.role === "STUDENT") {
    const enrollment = await db.seasonEnrollment.findUnique({
      where: { studentUserId_seasonId: { studentUserId: user.userId, seasonId } },
      select: { id: true },
    });
    return enrollment !== null;
  }

  return false;
}

export async function canAccessGroup(
  user: SessionUser,
  groupId: number,
): Promise<boolean> {
  if (isSuper(user) || isMentor(user)) return true;
  if (isLeaderOfGroup(user, groupId)) return true;

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { seasonId: true },
  });
  if (!group) return false;
  if (isAdminOfSeason(user, group.seasonId)) return true;

  if (user.role === "STUDENT") {
    const membership = await db.groupStudent.findUnique({
      where: { studentUserId: user.userId },
      select: { groupId: true },
    });
    return membership?.groupId === groupId;
  }

  return false;
}

export async function canMarkAttendance(
  user: SessionUser,
  sessionId: number,
): Promise<boolean> {
  if (isSuper(user)) return true;
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true },
  });
  if (!session) return false;
  if (isAdminOfSeason(user, session.seasonId)) return true;
  if (user.role !== "LEADER") return false;
  if (user.groupLeaderIds.length === 0) return false;
  const groupInSeason = await db.group.findFirst({
    where: { seasonId: session.seasonId, id: { in: user.groupLeaderIds } },
    select: { id: true },
  });
  return groupInSeason !== null;
}

export async function canViewSubmission(
  user: SessionUser,
  submissionId: number,
): Promise<boolean> {
  if (isSuper(user) || isMentor(user)) return true;

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      studentUserId: true,
      assignment: { select: { seasonId: true } },
    },
  });
  if (!submission) return false;

  if (submission.studentUserId === user.userId) return true;
  if (isAdminOfSeason(user, submission.assignment.seasonId)) return true;

  if (user.role === "LEADER") {
    const membership = await db.groupStudent.findUnique({
      where: { studentUserId: submission.studentUserId },
      select: { groupId: true },
    });
    if (!membership) return false;
    return isLeaderOfGroup(user, membership.groupId);
  }

  return false;
}

export interface VisibleStudent {
  id: number;
  name: string | null;
  email: string;
}

export async function getVisibleStudents(
  user: SessionUser,
): Promise<VisibleStudent[]> {
  if (isSuper(user) || isMentor(user)) {
    return db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  if (user.role === "ADMIN") {
    if (user.seasonAdminIds.length === 0) return [];
    const enrollments = await db.seasonEnrollment.findMany({
      where: { seasonId: { in: user.seasonAdminIds } },
      select: { studentUserId: true },
      distinct: ["studentUserId"],
    });
    const ids = enrollments.map((e) => e.studentUserId);
    if (ids.length === 0) return [];
    return db.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  if (user.role === "LEADER") {
    if (user.groupLeaderIds.length === 0) return [];
    const memberships = await db.groupStudent.findMany({
      where: { groupId: { in: user.groupLeaderIds } },
      select: { studentUserId: true },
    });
    const ids = memberships.map((m) => m.studentUserId);
    if (ids.length === 0) return [];
    return db.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  if (user.role === "STUDENT") {
    return db.user.findMany({
      where: { id: user.userId },
      select: { id: true, name: true, email: true },
    });
  }

  return [];
}

export interface StudentSeasonAccess {
  canViewSubmissions: boolean;
  isReadOnly: boolean;
}

export async function getStudentSeasonAccess(
  studentUserId: number,
  seasonId: number,
): Promise<StudentSeasonAccess> {
  const profile = await db.studentProfile.findUnique({
    where: { userId: studentUserId },
    select: { activeSeasonId: true },
  });
  if (profile?.activeSeasonId === seasonId) {
    return { canViewSubmissions: true, isReadOnly: false };
  }
  return { canViewSubmissions: false, isReadOnly: true };
}

// ---------------------------------------------------------------------------
// Assignment & submission gates
// ---------------------------------------------------------------------------

export function canCreateAssignment(
  user: SessionUser,
  seasonId: number,
): boolean {
  return isAdminOfSeason(user, seasonId);
}

export async function canEditAssignment(
  user: SessionUser,
  assignmentId: number,
): Promise<boolean> {
  const a = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { seasonId: true },
  });
  if (!a) return false;
  return isAdminOfSeason(user, a.seasonId);
}

export async function canReviewSubmission(
  user: SessionUser,
  submissionId: number,
): Promise<boolean> {
  if (isSuper(user)) return true;
  const sub = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      studentUserId: true,
      assignment: { select: { seasonId: true } },
    },
  });
  if (!sub) return false;
  if (isAdminOfSeason(user, sub.assignment.seasonId)) return true;
  if (user.role === "LEADER") {
    const m = await db.groupStudent.findUnique({
      where: { studentUserId: sub.studentUserId },
      select: { groupId: true },
    });
    if (!m) return false;
    return isLeaderOfGroup(user, m.groupId);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Student & notes gates
// ---------------------------------------------------------------------------

export async function canViewStudent(
  user: SessionUser,
  studentUserId: number,
): Promise<boolean> {
  if (isSuper(user) || isMentor(user)) return true;
  if (user.userId === studentUserId) return true;

  if (user.role === "ADMIN") {
    if (user.seasonAdminIds.length === 0) return false;
    const enrollment = await db.seasonEnrollment.findFirst({
      where: { studentUserId, seasonId: { in: user.seasonAdminIds } },
      select: { id: true },
    });
    return enrollment !== null;
  }

  if (user.role === "LEADER") {
    if (user.groupLeaderIds.length === 0) return false;
    const membership = await db.groupStudent.findUnique({
      where: { studentUserId },
      select: { groupId: true },
    });
    if (!membership) return false;
    return isLeaderOfGroup(user, membership.groupId);
  }

  return false;
}

export async function canEditStudent(
  user: SessionUser,
  studentUserId: number,
): Promise<boolean> {
  if (isSuper(user)) return true;
  if (user.userId === studentUserId) return true;
  if (user.role === "ADMIN") {
    const profile = await db.studentProfile.findUnique({
      where: { userId: studentUserId },
      select: { activeSeasonId: true },
    });
    if (!profile?.activeSeasonId) return false;
    return isAdminOfSeason(user, profile.activeSeasonId);
  }
  return false;
}

export async function canWriteNote(
  user: SessionUser,
  studentUserId: number,
): Promise<boolean> {
  if (isSuper(user) || isMentor(user)) return true;
  if (user.role === "ADMIN") {
    const profile = await db.studentProfile.findUnique({
      where: { userId: studentUserId },
      select: { activeSeasonId: true },
    });
    if (!profile?.activeSeasonId) return false;
    return isAdminOfSeason(user, profile.activeSeasonId);
  }
  if (user.role === "LEADER") {
    const m = await db.groupStudent.findUnique({
      where: { studentUserId },
      select: { groupId: true },
    });
    if (!m) return false;
    return isLeaderOfGroup(user, m.groupId);
  }
  return false;
}

export function canManageNotifications(user: SessionUser): boolean {
  return isSuper(user);
}
