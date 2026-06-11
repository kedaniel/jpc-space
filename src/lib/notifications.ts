import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import type { NotificationType } from "@/generated/prisma/enums";

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Map NotificationType → field name on NotificationPreference.
 * Used to short-circuit when a user has opted out.
 */
const PREF_FIELD: Record<NotificationType, string> = {
  ASSIGNMENT_CREATED: "assignmentCreated",
  SUBMISSION_REVIEWED: "submissionReviewed",
  SESSION_RESCHEDULED: "sessionRescheduled",
  LOW_ATTENDANCE_FLAG: "lowAttendanceFlag",
  MENTOR_FOLLOWUP: "mentorFollowup",
  QUIZ_GRADED: "quizGraded",
};

async function userAllowsType(userId: number, type: NotificationType): Promise<boolean> {
  const prefs = await db.notificationPreference.findUnique({
    where: { userId },
  });
  if (!prefs) return true;
  const field = PREF_FIELD[type] as keyof typeof prefs;
  return prefs[field] !== false;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!(await userAllowsType(input.userId, input.type))) return;
  const [, user] = await Promise.all([
    db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    }),
    db.user.findUnique({ where: { id: input.userId }, select: { email: true } }),
  ]);
  if (user) {
    sendNotificationEmail(user.email, input.title, input.body ?? null, input.link ?? null).catch(
      () => undefined,
    );
  }
}

export async function createNotificationsBulk(
  userIds: number[],
  payload: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  if (userIds.length === 0) return;

  const prefs = await db.notificationPreference.findMany({
    where: { userId: { in: userIds } },
  });
  const prefField = PREF_FIELD[payload.type] as
    | "assignmentCreated"
    | "submissionReviewed"
    | "sessionRescheduled"
    | "lowAttendanceFlag"
    | "mentorFollowup";
  const optedOut = new Set(
    prefs.filter((p) => p[prefField] === false).map((p) => p.userId),
  );
  const targets = userIds.filter((id) => !optedOut.has(id));
  if (targets.length === 0) return;

  await db.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
    })),
  });
  const users = await db.user.findMany({
    where: { id: { in: targets } },
    select: { email: true },
  });
  void Promise.allSettled(
    users.map((u) =>
      sendNotificationEmail(u.email, payload.title, payload.body ?? null, payload.link ?? null),
    ),
  );
}

export async function unreadCount(userId: number): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export interface NotificationListItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listRecent(userId: number, limit = 10): Promise<NotificationListItem[]> {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function markRead(userId: number, ids?: number[]): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
}
