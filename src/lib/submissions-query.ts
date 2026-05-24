import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import type { SubmissionStatus } from "@/generated/prisma/enums";

export interface SubmissionDetailData {
  id: number;
  publicId: string;
  status: SubmissionStatus;
  text: string | null;
  feedback: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  assignmentId: number;
  assignmentTitle: string;
  assignmentDueAt: Date | null;
  assignmentDescription: string | null;
  seasonId: number;
  seasonCode: string;
  studentUserId: number;
  studentName: string | null;
  studentEmail: string;
  groupName: string | null;
  files: {
    id: number;
    originalName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  }[];
}

export async function loadSubmissionByPublicId(publicId: string): Promise<SubmissionDetailData> {
  const sub = await db.submission.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      status: true,
      text: true,
      feedback: true,
      submittedAt: true,
      reviewedAt: true,
      assignmentId: true,
      assignment: {
        select: {
          title: true,
          dueAt: true,
          description: true,
          seasonId: true,
          season: { select: { code: true } },
        },
      },
      studentUserId: true,
      studentUser: { select: { name: true, email: true } },
      files: {
        select: {
          id: true,
          originalName: true,
          storagePath: true,
          mimeType: true,
          sizeBytes: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });
  if (!sub) notFound();

  const groupMembership = await db.groupStudent.findUnique({
    where: { studentUserId: sub.studentUserId },
    select: { group: { select: { name: true } } },
  });

  return {
    id: sub.id,
    publicId: sub.publicId,
    status: sub.status,
    text: sub.text,
    feedback: sub.feedback,
    submittedAt: sub.submittedAt,
    reviewedAt: sub.reviewedAt,
    assignmentId: sub.assignmentId,
    assignmentTitle: sub.assignment.title,
    assignmentDueAt: sub.assignment.dueAt,
    assignmentDescription: sub.assignment.description,
    seasonId: sub.assignment.seasonId,
    seasonCode: sub.assignment.season.code,
    studentUserId: sub.studentUserId,
    studentName: sub.studentUser.name,
    studentEmail: sub.studentUser.email,
    groupName: groupMembership?.group?.name ?? null,
    files: sub.files,
  };
}

export interface LeaderQueueRow {
  publicId: string;
  status: SubmissionStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  assignmentTitle: string;
  assignmentDueAt: Date | null;
  studentName: string | null;
  studentEmail: string;
  groupName: string | null;
}

export async function listSubmissionsForLeader(
  groupLeaderIds: number[],
): Promise<LeaderQueueRow[]> {
  if (groupLeaderIds.length === 0) return [];

  // Students in the leader's groups.
  const members = await db.groupStudent.findMany({
    where: { groupId: { in: groupLeaderIds } },
    select: { studentUserId: true, group: { select: { name: true } } },
  });
  const byStudent = new Map(members.map((m) => [m.studentUserId, m.group.name]));
  const studentIds = members.map((m) => m.studentUserId);
  if (studentIds.length === 0) return [];

  const subs = await db.submission.findMany({
    where: {
      studentUserId: { in: studentIds },
      status: { in: ["SUBMITTED", "REVIEWED", "RETURNED"] },
    },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    select: {
      publicId: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      assignment: { select: { title: true, dueAt: true } },
      studentUserId: true,
      studentUser: { select: { name: true, email: true } },
    },
  });

  return subs.map((s) => ({
    publicId: s.publicId,
    status: s.status,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt,
    assignmentTitle: s.assignment.title,
    assignmentDueAt: s.assignment.dueAt,
    studentName: s.studentUser.name,
    studentEmail: s.studentUser.email,
    groupName: byStudent.get(s.studentUserId) ?? null,
  }));
}
