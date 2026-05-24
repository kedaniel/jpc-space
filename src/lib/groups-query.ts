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

export async function listGroupsForSeason(seasonId: number): Promise<GroupListRow[]> {
  const rows = await db.group.findMany({
    where: { seasonId },
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
