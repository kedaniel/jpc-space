"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { nanoid } from "nanoid";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAdminOfSeason, isLeaderInSeason } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";
import { generateRecurringDates, siblingsInScope, type RecurrenceScope } from "@/lib/recurrence";
import { createNotificationsBulk } from "@/lib/notifications";
import { newPublicId } from "@/lib/public-id";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const sessionSchema = z.object({
  title: z.string().min(2).max(120),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().min(15).max(600),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export interface SessionInput {
  title: string;
  startsAt: Date | string;
  durationMinutes: number;
  location?: string | null;
  description?: string | null;
}

export interface CreateSessionInput extends SessionInput {
  // Optional weekly recurrence — creates N siblings sharing recurrenceGroupId.
  repeatWeeks?: number;
}

export async function createSessionAction(
  seasonId: number,
  input: CreateSessionInput,
): Promise<ActionResult & { sessionId?: number }> {
  const user = await getCurrentUserOrRedirect();
  if (!isAdminOfSeason(user, seasonId)) throw new ForbiddenError();

  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  const count = Math.max(1, Math.min(input.repeatWeeks ?? 1, 26));
  const recurrenceGroupId = count > 1 ? nanoid(8) : null;
  const dates = generateRecurringDates(parsed.data.startsAt, count, 7);

  const result = await db.$transaction(async (tx) => {
    const sessions = await Promise.all(
      dates.map((startsAt) =>
        tx.session.create({
          data: {
            seasonId,
            title: parsed.data.title,
            startsAt,
            durationMinutes: parsed.data.durationMinutes,
            location: parsed.data.location ?? null,
            description: parsed.data.description ?? null,
            recurrenceGroupId,
          },
          select: { id: true },
        }),
      ),
    );
    return sessions[0];
  });

  revalidatePath("/admin/season");
  revalidatePath("/admin/calendar");
  revalidatePath("/leader/calendar");
  revalidatePath("/student/calendar");
  return { ok: true, sessionId: result.id };
}

export interface UpdateSessionInput extends SessionInput {
  scope: RecurrenceScope;
}

export async function updateSessionAction(
  sessionId: number,
  input: UpdateSessionInput,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const existing = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      seasonId: true,
      recurrenceGroupId: true,
      startsAt: true,
    },
  });
  if (!existing) return { ok: false, error: "Session not found." };
  if (!isAdminOfSeason(user, existing.seasonId)) throw new ForbiddenError();

  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  const series =
    existing.recurrenceGroupId && input.scope !== "one"
      ? await db.session.findMany({
          where: { recurrenceGroupId: existing.recurrenceGroupId },
          select: { id: true, startsAt: true },
          orderBy: { startsAt: "asc" },
        })
      : [{ id: existing.id, startsAt: existing.startsAt }];

  const targets = siblingsInScope(series, { id: existing.id, startsAt: existing.startsAt }, input.scope);
  const targetIds = targets.map((t) => t.id);

  const startTimeChanged = parsed.data.startsAt.getTime() !== existing.startsAt.getTime();

  // For "this only", apply the date verbatim. For series, shift each sibling by the same delta.
  if (input.scope === "one") {
    await db.session.update({
      where: { id: sessionId },
      data: {
        title: parsed.data.title,
        startsAt: parsed.data.startsAt,
        durationMinutes: parsed.data.durationMinutes,
        location: parsed.data.location ?? null,
        description: parsed.data.description ?? null,
      },
    });
  } else {
    const delta = parsed.data.startsAt.getTime() - existing.startsAt.getTime();
    await db.$transaction(
      targets.map((t) =>
        db.session.update({
          where: { id: t.id },
          data: {
            title: parsed.data.title,
            startsAt: new Date(t.startsAt.getTime() + delta),
            durationMinutes: parsed.data.durationMinutes,
            location: parsed.data.location ?? null,
            description: parsed.data.description ?? null,
          },
        }),
      ),
    );
  }

  if (startTimeChanged) {
    const enrolled = await db.seasonEnrollment.findMany({
      where: { seasonId: existing.seasonId, status: "ACTIVE" },
      select: { studentUserId: true },
    });
    if (enrolled.length > 0) {
      await createNotificationsBulk(
        enrolled.map((e) => e.studentUserId),
        {
          type: "SESSION_RESCHEDULED",
          title: `Session "${parsed.data.title}" rescheduled`,
          body: `New time: ${parsed.data.startsAt.toLocaleString()}`,
          link: `/student/calendar`,
        },
      );
    }
  }

  revalidatePath("/admin/season");
  revalidatePath("/admin/calendar");
  revalidatePath("/leader/calendar");
  revalidatePath("/student/calendar");
  void targetIds;
  return { ok: true };
}

export async function deleteSessionAction(
  sessionId: number,
  scope: RecurrenceScope = "one",
): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  const existing = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      seasonId: true,
      recurrenceGroupId: true,
      startsAt: true,
      season: { select: { code: true } },
    },
  });
  if (!existing) return;
  if (!isAdminOfSeason(user, existing.seasonId)) throw new ForbiddenError();

  const series =
    existing.recurrenceGroupId && scope !== "one"
      ? await db.session.findMany({
          where: { recurrenceGroupId: existing.recurrenceGroupId },
          select: { id: true, startsAt: true },
          orderBy: { startsAt: "asc" },
        })
      : [{ id: existing.id, startsAt: existing.startsAt }];
  const targets = siblingsInScope(series, { id: existing.id, startsAt: existing.startsAt }, scope);

  await db.session.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });

  revalidatePath("/admin/season");
  revalidatePath("/admin/calendar");
  redirect(`/admin/season/${existing.season.code}/calendar`);
}

function zodErrors(err: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

export async function openCheckInAction(sessionId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true, checkInToken: true },
  });
  if (!session) return { ok: false, error: "Session not found." };

  if (!(await isLeaderInSeason(user, session.seasonId))) throw new ForbiddenError();

  await db.session.update({
    where: { id: sessionId },
    data: {
      checkInToken: session.checkInToken ?? newPublicId(),
      checkInOpenAt: new Date(),
      checkInClosedAt: null,
    },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  revalidatePath(`/admin/season`);
  return { ok: true };
}

export async function closeCheckInAction(sessionId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true },
  });
  if (!session) return { ok: false, error: "Session not found." };

  if (!(await isLeaderInSeason(user, session.seasonId))) throw new ForbiddenError();

  await db.session.update({
    where: { id: sessionId },
    data: { checkInClosedAt: new Date() },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  revalidatePath(`/admin/season`);
  return { ok: true };
}
