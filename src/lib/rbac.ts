import type { UserRole } from "@/generated/prisma/enums";

export interface SessionUser {
  userId: number;
  role: UserRole;
  seasonAdminIds: number[];
  groupLeaderIds: number[];
  activeSeasonId: number | null;
}

export function isSuper(u: SessionUser): boolean {
  return u.role === "SUPER";
}

export function isMentor(u: SessionUser): boolean {
  return u.role === "MENTOR";
}

export function isAdminOfSeason(u: SessionUser, seasonId: number): boolean {
  return u.role === "SUPER" || u.seasonAdminIds.includes(seasonId);
}

export function isLeaderOfGroup(u: SessionUser, groupId: number): boolean {
  return u.groupLeaderIds.includes(groupId);
}

export async function isLeaderInSeason(
  u: SessionUser,
  seasonId: number,
): Promise<boolean> {
  if (u.role === "SUPER") return true;
  if (u.seasonAdminIds.includes(seasonId)) return true;
  if (u.groupLeaderIds.length === 0) return false;
  const { db } = await import("@/lib/db");
  const count = await db.group.count({
    where: {
      seasonId,
      id: { in: u.groupLeaderIds },
    },
  });
  return count > 0;
}

export function canReadAllStudents(u: SessionUser): boolean {
  return u.role === "SUPER" || u.role === "MENTOR";
}

export function canManageUsers(u: SessionUser): boolean {
  return u.role === "SUPER";
}
