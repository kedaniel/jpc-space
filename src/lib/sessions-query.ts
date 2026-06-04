import { notFound } from "next/navigation";

import { db } from "@/lib/db";

export interface SessionListRow {
  id: number;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  location: string | null;
  recurrenceGroupId: string | null;
  attendanceMarked: boolean;
  seasonId: number;
  seasonCode: string;
  seasonTitle: string;
  checkInToken: string | null;
  checkInOpenAt: Date | null;
  checkInClosedAt: Date | null;
}

export async function listSessionsForSeason(seasonId: number): Promise<SessionListRow[]> {
  const rows = await db.session.findMany({
    where: { seasonId },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      recurrenceGroupId: true,
      checkInToken: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
      _count: { select: { attendance: true } },
      season: { select: { id: true, code: true, title: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
    location: s.location,
    recurrenceGroupId: s.recurrenceGroupId,
    attendanceMarked: s._count.attendance > 0,
    seasonId: s.season.id,
    seasonCode: s.season.code,
    seasonTitle: s.season.title,
  }));
}

export async function listSessionsForAllActiveSeasons(): Promise<SessionListRow[]> {
  const rows = await db.session.findMany({
    where: { season: { status: "ACTIVE", deletedAt: null } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      recurrenceGroupId: true,
      _count: { select: { attendance: true } },
      season: { select: { id: true, code: true, title: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
    location: s.location,
    recurrenceGroupId: s.recurrenceGroupId,
    attendanceMarked: s._count.attendance > 0,
    seasonId: s.season.id,
    seasonCode: s.season.code,
    seasonTitle: s.season.title,
    checkInToken: s.checkInToken,
    checkInOpenAt: s.checkInOpenAt,
    checkInClosedAt: s.checkInClosedAt,
  }));
}

export interface SessionDetailData {
  id: number;
  title: string;
  description: string | null;
  startsAt: Date;
  durationMinutes: number;
  location: string | null;
  recurrenceGroupId: string | null;
  seasonId: number;
  seasonCode: string;
  seasonTitle: string;
  checkInToken: string | null;
  checkInOpenAt: Date | null;
  checkInClosedAt: Date | null;
}

export async function loadSessionById(id: number): Promise<SessionDetailData> {
  const s = await db.session.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      recurrenceGroupId: true,
      seasonId: true,
      season: { select: { code: true, title: true } },
      checkInToken: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
    },
  });
  if (!s) notFound();
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
    location: s.location,
    recurrenceGroupId: s.recurrenceGroupId,
    seasonId: s.seasonId,
    seasonCode: s.season.code,
    seasonTitle: s.season.title,
    checkInToken: s.checkInToken,
    checkInOpenAt: s.checkInOpenAt,
    checkInClosedAt: s.checkInClosedAt,
  };
}

export interface AttendanceRosterEntry {
  studentUserId: number;
  name: string | null;
  email: string;
  groupName: string | null;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | null;
  notes: string | null;
}

export async function loadAttendanceRoster(
  sessionId: number,
  groupIds?: number[],
): Promise<AttendanceRosterEntry[]> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true },
  });
  if (!session) notFound();

  const enrollments = await db.seasonEnrollment.findMany({
    where: {
      seasonId: session.seasonId,
      status: "ACTIVE",
      ...(groupIds ? { groupId: { in: groupIds } } : {}),
    },
    select: {
      studentUserId: true,
      group: { select: { name: true } },
      studentUser: { select: { name: true, email: true } },
    },
    orderBy: [{ group: { name: "asc" } }, { studentUser: { name: "asc" } }],
  });

  const attendance = await db.attendance.findMany({
    where: { sessionId },
    select: { studentUserId: true, status: true, notes: true },
  });
  const byStudent = new Map(attendance.map((a) => [a.studentUserId, a]));

  return enrollments.map((e) => {
    const a = byStudent.get(e.studentUserId);
    return {
      studentUserId: e.studentUserId,
      name: e.studentUser.name,
      email: e.studentUser.email,
      groupName: e.group?.name ?? null,
      status: a?.status ?? null,
      notes: a?.notes ?? null,
    };
  });
}
