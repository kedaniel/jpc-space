import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/rbac";
import { canReadAllStudents, isSuper, isMentor } from "@/lib/rbac";

export interface StudentListRow {
  id: number;
  name: string | null;
  email: string;
  university: string | null;
  year: string | null;
  photoPath: string | null;
  avatarPath: string | null;
  avatarUrl?: string | null;
  activeSeasonTitle: string | null;
  groupName: string | null;
}

export async function listStudentsForScope(
  user: SessionUser,
  search?: string,
): Promise<StudentListRow[]> {
  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { studentProfile: { university: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Scope filter: admins only see students enrolled in their seasons.
  let visibleIds: number[] | null = null;
  if (!canReadAllStudents(user)) {
    if (user.role === "ADMIN") {
      const enrollments = await db.seasonEnrollment.findMany({
        where: { seasonId: { in: user.seasonAdminIds } },
        select: { studentUserId: true },
        distinct: ["studentUserId"],
      });
      visibleIds = enrollments.map((e) => e.studentUserId);
    } else if (user.role === "LEADER") {
      const members = await db.groupStudent.findMany({
        where: { groupId: { in: user.groupLeaderIds } },
        select: { studentUserId: true },
      });
      visibleIds = members.map((m) => m.studentUserId);
    } else {
      visibleIds = [];
    }
    if (visibleIds.length === 0) return [];
    where.id = { in: visibleIds };
  }

  const rows = await db.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      avatarPath: true,
      studentProfile: {
        select: {
          university: true,
          year: true,
          photoPath: true,
          activeSeason: { select: { title: true } },
        },
      },
      groupStudentMembership: {
        select: { group: { select: { name: true } } },
      },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarPath: u.avatarPath,
    university: u.studentProfile?.university ?? null,
    year: u.studentProfile?.year ?? null,
    photoPath: u.studentProfile?.photoPath ?? null,
    activeSeasonTitle: u.studentProfile?.activeSeason?.title ?? null,
    groupName: u.groupStudentMembership?.group.name ?? null,
  }));
}

export interface StudentDetailData {
  id: number;
  email: string;
  name: string | null;
  avatarPath: string | null;
  profile: {
    university: string | null;
    year: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    spiritualBackground: string | null;
    gifts: string | null;
    notes: string | null;
    photoPath: string | null;
    activeSeasonId: number | null;
    activeSeasonTitle: string | null;
    activeSeasonCode: string | null;
  };
  currentGroup: { id: number; name: string } | null;
  seasons: {
    id: number;
    title: string;
    code: string;
    status: string;
    startDate: Date;
    endDate: Date;
    groupName: string | null;
    enrollmentStatus: string;
    attendancePct: number;
  }[];
  attendance: {
    sessionId: number;
    sessionTitle: string;
    startsAt: Date;
    seasonTitle: string;
    status: string;
  }[];
  submissions: {
    publicId: string;
    assignmentTitle: string;
    status: string;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    seasonTitle: string;
  }[];
  notes: {
    id: number;
    body: string;
    visibility: string;
    followUpFlagged: boolean;
    createdAt: Date;
    authorId: number;
    authorName: string | null;
    authorRole: string;
    seasonTitle: string | null;
  }[];
  documents: {
    id: number;
    originalName: string;
    sizeBytes: number;
    mimeType: string;
    uploadedAt: Date;
  }[];
}

/**
 * Apply the privacy filter for student self-view of past seasons:
 * if `forStudentSelfView`, submissions are restricted to the student's
 * active season (history shows zero submission detail).
 */
export async function loadStudentDetail(
  studentUserId: number,
  options: { viewerRole?: SessionUser["role"]; forStudentSelfView?: boolean } = {},
): Promise<StudentDetailData> {
  const user = await db.user.findFirst({
    where: { id: studentUserId, role: "STUDENT", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      avatarPath: true,
      studentProfile: {
        select: {
          university: true,
          year: true,
          phone: true,
          dateOfBirth: true,
          spiritualBackground: true,
          gifts: true,
          notes: true,
          photoPath: true,
          activeSeasonId: true,
          activeSeason: { select: { title: true, code: true } },
        },
      },
      groupStudentMembership: {
        select: { group: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) notFound();

  const enrollments = await db.seasonEnrollment.findMany({
    where: { studentUserId },
    orderBy: { enrolledAt: "desc" },
    select: {
      seasonId: true,
      status: true,
      season: {
        select: { id: true, title: true, code: true, status: true, startDate: true, endDate: true },
      },
      group: { select: { name: true } },
    },
  });

  const seasonIds = enrollments.map((e) => e.seasonId);

  // Attendance log across seasons.
  const attendanceRows = await db.attendance.findMany({
    where: {
      studentUserId,
      session: { seasonId: { in: seasonIds } },
    },
    orderBy: { session: { startsAt: "desc" } },
    take: 100,
    select: {
      status: true,
      session: { select: { id: true, title: true, startsAt: true, season: { select: { title: true } } } },
    },
  });

  // Per-season attendance %.
  const attendanceBySeason = new Map<number, { total: number; present: number }>();
  for (const enrollment of enrollments) {
    attendanceBySeason.set(enrollment.seasonId, { total: 0, present: 0 });
  }
  for (const a of attendanceRows) {
    // We don't have seasonId on the attendance row directly here; rely on the join below.
    void a;
  }
  // Easier: separate aggregate query per season.
  for (const e of enrollments) {
    const totalSessions = await db.session.count({
      where: { seasonId: e.seasonId, startsAt: { lte: new Date() } },
    });
    const presentCount = await db.attendance.count({
      where: {
        studentUserId,
        session: { seasonId: e.seasonId },
        status: { in: ["PRESENT", "LATE"] },
      },
    });
    attendanceBySeason.set(e.seasonId, { total: totalSessions, present: presentCount });
  }

  // Submissions across seasons.
  let submissionWhereSeasonIds = seasonIds;
  if (options.forStudentSelfView) {
    submissionWhereSeasonIds = user.studentProfile?.activeSeasonId
      ? [user.studentProfile.activeSeasonId]
      : [];
  }
  const submissionRows = submissionWhereSeasonIds.length
    ? await db.submission.findMany({
        where: {
          studentUserId,
          assignment: { seasonId: { in: submissionWhereSeasonIds } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          publicId: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          assignment: {
            select: { title: true, season: { select: { title: true } } },
          },
        },
      })
    : [];

  // Notes (skipped entirely for student self-view).
  const noteRows = options.forStudentSelfView
    ? []
    : await db.engagementNote.findMany({
        where: { studentUserId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          body: true,
          visibility: true,
          followUpFlagged: true,
          createdAt: true,
          authorUser: { select: { id: true, name: true, role: true } },
          season: { select: { title: true } },
        },
      });

  // Documents.
  const documents = await db.studentDocument.findMany({
    where: { studentUserId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      originalName: true,
      sizeBytes: true,
      mimeType: true,
      uploadedAt: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarPath: user.avatarPath,
    profile: {
      university: user.studentProfile?.university ?? null,
      year: user.studentProfile?.year ?? null,
      phone: user.studentProfile?.phone ?? null,
      dateOfBirth: user.studentProfile?.dateOfBirth ?? null,
      spiritualBackground: user.studentProfile?.spiritualBackground ?? null,
      gifts: user.studentProfile?.gifts ?? null,
      notes: options.forStudentSelfView ? null : user.studentProfile?.notes ?? null,
      photoPath: user.studentProfile?.photoPath ?? null,
      activeSeasonId: user.studentProfile?.activeSeasonId ?? null,
      activeSeasonTitle: user.studentProfile?.activeSeason?.title ?? null,
      activeSeasonCode: user.studentProfile?.activeSeason?.code ?? null,
    },
    currentGroup: user.groupStudentMembership?.group
      ? { id: user.groupStudentMembership.group.id, name: user.groupStudentMembership.group.name }
      : null,
    seasons: enrollments.map((e) => {
      const att = attendanceBySeason.get(e.seasonId) ?? { total: 0, present: 0 };
      return {
        id: e.season.id,
        title: e.season.title,
        code: e.season.code,
        status: e.season.status,
        startDate: e.season.startDate,
        endDate: e.season.endDate,
        groupName: e.group?.name ?? null,
        enrollmentStatus: e.status,
        attendancePct: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
      };
    }),
    attendance: attendanceRows.map((a) => ({
      sessionId: a.session.id,
      sessionTitle: a.session.title,
      startsAt: a.session.startsAt,
      seasonTitle: a.session.season.title,
      status: a.status,
    })),
    submissions: submissionRows.map((s) => ({
      publicId: s.publicId,
      assignmentTitle: s.assignment.title,
      status: s.status,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      seasonTitle: s.assignment.season.title,
    })),
    notes: noteRows.map((n) => ({
      id: n.id,
      body: n.body,
      visibility: n.visibility,
      followUpFlagged: n.followUpFlagged,
      createdAt: n.createdAt,
      authorId: n.authorUser.id,
      authorName: n.authorUser.name,
      authorRole: n.authorUser.role,
      seasonTitle: n.season?.title ?? null,
    })),
    documents,
  };
}

// Filter notes that the viewer is allowed to see based on visibility + role.
export function filterVisibleNotes(
  notes: StudentDetailData["notes"],
  viewer: SessionUser,
): StudentDetailData["notes"] {
  if (isSuper(viewer)) return notes;
  return notes.filter((n) => {
    if (n.authorId === viewer.userId) return true;
    if (n.visibility === "ADMINS" && viewer.role === "ADMIN") return true;
    if (n.visibility === "MENTORS" && isMentor(viewer)) return true;
    if (n.visibility === "LEADERS" && viewer.role === "LEADER") return true;
    return false;
  });
}
