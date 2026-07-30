import { notFound } from "next/navigation";

import { db } from "@/lib/db";

export interface GroupListRow {
  id: number;
  name: string;
  description: string | null;
  studentCount: number;
  leaderNames: string[];
  seasonCode: string;
  seasonTitle: string;
}

/**
 * `onlyStudentUserId` narrows the list to that student's own group. Students may
 * only see their own group and its leaders, so the scope is applied in the query
 * rather than filtered out of the response.
 */
export async function listGroupsForSeason(
  seasonId: number,
  { onlyStudentUserId }: { onlyStudentUserId?: number } = {},
): Promise<GroupListRow[]> {
  const rows = await db.group.findMany({
    where: {
      seasonId,
      ...(onlyStudentUserId
        ? { students: { some: { studentUserId: onlyStudentUserId } } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { students: true } },
      leaders: { select: { user: { select: { name: true } } } },
      season: { select: { code: true, title: true } },
    },
  });
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    studentCount: g._count.students,
    leaderNames: g.leaders.map((l) => l.user.name).filter((n): n is string => Boolean(n)),
    seasonCode: g.season.code,
    seasonTitle: g.season.title,
  }));
}

export interface GroupDetailData {
  id: number;
  name: string;
  description: string | null;
  seasonId: number;
  seasonCode: string;
  seasonTitle: string;
  leaders: { id: number; name: string | null; email: string }[];
  students: { id: number; name: string | null; email: string }[];
}

export async function loadGroupById(id: number): Promise<GroupDetailData> {
  const g = await db.group.findUnique({
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
        select: {
          studentUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { studentUser: { name: "asc" } },
      },
    },
  });
  if (!g) notFound();

  return {
    id: g.id,
    name: g.name,
    description: g.description,
    seasonId: g.seasonId,
    seasonCode: g.season.code,
    seasonTitle: g.season.title,
    leaders: g.leaders.map((l) => l.user),
    students: g.students.map((s) => s.studentUser),
  };
}

export interface UserPickerOption {
  id: number;
  name: string | null;
  email: string;
}

export async function listLeadersForPicker(): Promise<UserPickerOption[]> {
  return db.user.findMany({
    where: { role: "LEADER", deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function listStudentsForPicker(seasonId: number): Promise<UserPickerOption[]> {
  // All students globally so admins can enroll new students into a group when creating it.
  // (UI shows current group membership separately.)
  void seasonId;
  return db.user.findMany({
    where: { role: "STUDENT", deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export interface GroupSelectOption {
  id: number;
  name: string;
}

export async function listGroupsForSelect(seasonId: number): Promise<GroupSelectOption[]> {
  return db.group.findMany({
    where: { seasonId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export interface RosterStudent {
  userId: number;
  name: string | null;
  email: string;
  groupId: number | null;
}

export async function listSeasonRoster(seasonId: number): Promise<RosterStudent[]> {
  const students = await db.studentProfile.findMany({
    where: { activeSeasonId: seasonId, deletedAt: null, user: { deletedAt: null } },
    select: { userId: true, user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  if (students.length === 0) return [];

  const memberships = await db.groupStudent.findMany({
    where: { studentUserId: { in: students.map((s) => s.userId) }, group: { seasonId } },
    select: { studentUserId: true, groupId: true },
  });
  const groupByStudent = new Map(memberships.map((m) => [m.studentUserId, m.groupId]));

  return students.map((s) => ({
    userId: s.userId,
    name: s.user.name,
    email: s.user.email,
    groupId: groupByStudent.get(s.userId) ?? null,
  }));
}
