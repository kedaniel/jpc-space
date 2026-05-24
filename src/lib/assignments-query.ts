import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import type { SubmissionStatus } from "@/generated/prisma/enums";

export interface AssignmentListRow {
  id: number;
  title: string;
  dueAt: Date | null;
  isAllGroups: boolean;
  submissionCount: number;
  expectedCount: number;
  seasonCode: string;
}

export async function listAssignmentsForSeason(seasonId: number): Promise<AssignmentListRow[]> {
  const rows = await db.assignment.findMany({
    where: { seasonId, deletedAt: null },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      dueAt: true,
      isAllGroups: true,
      _count: { select: { submissions: { where: { status: { not: "DRAFT" } } } } },
      targets: { select: { groupId: true } },
      season: { select: { code: true, id: true } },
    },
  });

  // Expected count: students in targeted groups (or all season-enrolled if isAllGroups).
  return Promise.all(
    rows.map(async (a) => {
      const expected = a.isAllGroups
        ? await db.seasonEnrollment.count({
            where: { seasonId: a.season.id, status: "ACTIVE" },
          })
        : await db.groupStudent.count({
            where: { groupId: { in: a.targets.map((t) => t.groupId) } },
          });
      return {
        id: a.id,
        title: a.title,
        dueAt: a.dueAt,
        isAllGroups: a.isAllGroups,
        submissionCount: a._count.submissions,
        expectedCount: expected,
        seasonCode: a.season.code,
      };
    }),
  );
}

export interface AssignmentDetailData {
  id: number;
  seasonId: number;
  seasonCode: string;
  seasonTitle: string;
  sessionId: number | null;
  sessionTitle: string | null;
  title: string;
  description: string | null;
  dueAt: Date | null;
  isAllGroups: boolean;
  maxFileSizeMb: number | null;
  allowedMimeCategories: string[];
  groupIds: number[];
}

export async function loadAssignmentById(id: number): Promise<AssignmentDetailData> {
  const a = await db.assignment.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      seasonId: true,
      season: { select: { code: true, title: true } },
      sessionId: true,
      session: { select: { title: true } },
      title: true,
      description: true,
      dueAt: true,
      isAllGroups: true,
      maxFileSizeMb: true,
      allowedMimeCategories: true,
      targets: { select: { groupId: true } },
    },
  });
  if (!a) notFound();
  return {
    id: a.id,
    seasonId: a.seasonId,
    seasonCode: a.season.code,
    seasonTitle: a.season.title,
    sessionId: a.sessionId,
    sessionTitle: a.session?.title ?? null,
    title: a.title,
    description: a.description,
    dueAt: a.dueAt,
    isAllGroups: a.isAllGroups,
    maxFileSizeMb: a.maxFileSizeMb,
    allowedMimeCategories: a.allowedMimeCategories,
    groupIds: a.targets.map((t) => t.groupId),
  };
}

export interface SubmissionTrackerRow {
  studentUserId: number;
  name: string | null;
  email: string;
  groupName: string | null;
  status: SubmissionStatus | "PENDING";
  isLate: boolean;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  submissionPublicId: string | null;
}

export async function loadSubmissionTracker(
  assignmentId: number,
): Promise<SubmissionTrackerRow[]> {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { seasonId: true, dueAt: true, isAllGroups: true, targets: { select: { groupId: true } } },
  });
  if (!assignment) return [];

  const enrollments = assignment.isAllGroups
    ? await db.seasonEnrollment.findMany({
        where: { seasonId: assignment.seasonId, status: "ACTIVE" },
        select: {
          studentUserId: true,
          group: { select: { name: true } },
          studentUser: { select: { name: true, email: true } },
        },
        orderBy: [{ group: { name: "asc" } }, { studentUser: { name: "asc" } }],
      })
    : await db.groupStudent.findMany({
        where: { groupId: { in: assignment.targets.map((t) => t.groupId) } },
        select: {
          studentUserId: true,
          group: { select: { name: true } },
          studentUser: { select: { name: true, email: true } },
        },
        orderBy: [{ group: { name: "asc" } }, { studentUser: { name: "asc" } }],
      });

  const studentIds = enrollments.map((e) => e.studentUserId);
  const submissions = await db.submission.findMany({
    where: { assignmentId, studentUserId: { in: studentIds } },
    select: {
      studentUserId: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      publicId: true,
    },
  });
  const byStudent = new Map(submissions.map((s) => [s.studentUserId, s]));

  return enrollments.map((e) => {
    const sub = byStudent.get(e.studentUserId);
    const isLate =
      sub?.submittedAt && assignment.dueAt
        ? sub.submittedAt.getTime() > assignment.dueAt.getTime()
        : false;
    return {
      studentUserId: e.studentUserId,
      name: e.studentUser.name,
      email: e.studentUser.email,
      groupName: e.group?.name ?? null,
      status: sub?.status ?? "PENDING",
      isLate,
      submittedAt: sub?.submittedAt ?? null,
      reviewedAt: sub?.reviewedAt ?? null,
      submissionPublicId: sub?.publicId ?? null,
    };
  });
}

export interface StudentAssignmentRow {
  id: number;
  title: string;
  dueAt: Date | null;
  status: SubmissionStatus | "PENDING";
  reviewedAt: Date | null;
}

export async function listAssignmentsForStudent(
  studentUserId: number,
  seasonId: number | null,
): Promise<StudentAssignmentRow[]> {
  if (!seasonId) return [];

  const groupMembership = await db.groupStudent.findUnique({
    where: { studentUserId },
    select: { groupId: true },
  });

  const assignments = await db.assignment.findMany({
    where: {
      seasonId,
      deletedAt: null,
      OR: [
        { isAllGroups: true },
        ...(groupMembership
          ? [{ targets: { some: { groupId: groupMembership.groupId } } }]
          : []),
      ],
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      dueAt: true,
      submissions: {
        where: { studentUserId },
        select: { status: true, reviewedAt: true },
      },
    },
  });

  return assignments.map((a) => {
    const sub = a.submissions[0];
    return {
      id: a.id,
      title: a.title,
      dueAt: a.dueAt,
      status: sub?.status ?? "PENDING",
      reviewedAt: sub?.reviewedAt ?? null,
    };
  });
}
