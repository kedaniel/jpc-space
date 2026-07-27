"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { SeasonStatus } from "@/generated/prisma/enums";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import {
  canCreateSeason,
  canEditSeason,
} from "@/lib/auth/permissions";
import { ForbiddenError } from "@/lib/auth/errors";
import { isValidSeasonCode, slugifySeasonCode } from "@/lib/slug";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const seasonSchema = z
  .object({
    code: z.string().min(2).max(40),
    program: z.string().min(1).max(60),
    year: z.number().int().min(2000).max(2100),
    description: z.string().max(2000).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum([
      SeasonStatus.DRAFT,
      SeasonStatus.ACTIVE,
      SeasonStatus.COMPLETED,
      SeasonStatus.ARCHIVED,
    ]),
    absenceBudgetMinutes: z.number().int().min(1).default(180),
    absenceWeightMinutes: z.number().int().min(1).default(90),
  })
  .refine((v) => isValidSeasonCode(v.code), {
    message: "Code must be lowercase letters, numbers, and dashes.",
    path: ["code"],
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

export interface SeasonInput {
  code: string;
  program: string;
  year: number;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: SeasonStatus;
  absenceBudgetMinutes?: number;
  absenceWeightMinutes?: number;
}

export async function createSeasonAction(
  input: SeasonInput,
): Promise<ActionResult & { code?: string }> {
  const user = await getCurrentUserOrRedirect();
  if (!canCreateSeason(user)) throw new ForbiddenError();

  const code = slugifySeasonCode(input.code || `${input.program} ${input.year}`);
  const parsed = seasonSchema.safeParse({ ...input, code });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const existing = await db.season.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return {
      ok: false,
      error: "A season with that code already exists.",
      fieldErrors: { code: "Already in use." },
    };
  }

  const season = await db.season.create({
    data: {
      code: parsed.data.code,
      title: `${parsed.data.program} ${parsed.data.year}`,
      program: parsed.data.program,
      year: parsed.data.year,
      description: parsed.data.description ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      createdById: user.userId,
      updatedById: user.userId,
    },
    select: { code: true },
  });

  revalidatePath("/super/seasons");
  revalidatePath("/admin/season");
  return { ok: true, code: season.code };
}

export async function updateSeasonAction(
  seasonId: number,
  input: SeasonInput,
): Promise<ActionResult & { code?: string }> {
  const user = await getCurrentUserOrRedirect();
  if (!canEditSeason(user, seasonId)) throw new ForbiddenError();

  const parsed = seasonSchema.safeParse({
    ...input,
    code: slugifySeasonCode(input.code),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const existing = await db.season.findFirst({
    where: { code: parsed.data.code, NOT: { id: seasonId } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "A season with that code already exists.",
      fieldErrors: { code: "Already in use." },
    };
  }

  const updated = await db.season.update({
    where: { id: seasonId },
    data: {
      code: parsed.data.code,
      title: `${parsed.data.program} ${parsed.data.year}`,
      program: parsed.data.program,
      year: parsed.data.year,
      description: parsed.data.description ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      absenceBudgetMinutes: parsed.data.absenceBudgetMinutes,
      absenceWeightMinutes: parsed.data.absenceWeightMinutes,
      updatedById: user.userId,
    },
    select: { code: true },
  });

  revalidatePath("/super/seasons");
  revalidatePath(`/super/seasons/${updated.code}`);
  revalidatePath("/admin/season");
  revalidatePath(`/admin/season/${updated.code}`);
  return { ok: true, code: updated.code };
}

export async function softDeleteSeasonAction(
  seasonId: number,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!canEditSeason(user, seasonId)) throw new ForbiddenError();

  await db.season.update({
    where: { id: seasonId },
    data: { deletedAt: new Date(), updatedById: user.userId },
  });

  revalidatePath("/super/seasons");
  revalidatePath("/admin/season");
  redirect("/super/seasons");
}

export interface DuplicateSeasonInput {
  year: number;
  code?: string;
  startDate: Date | string;
  endDate: Date | string;
}

const duplicateDatesSchema = z
  .object({ startDate: z.coerce.date(), endDate: z.coerce.date() })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

/**
 * Clones a season's structure (groups, sessions, assignments) into a new DRAFT
 * season with dates shifted by the same offset as the new start date. Deliberately
 * does not copy enrollments/attendance/submissions/quizzes — the new season is a
 * fresh, empty batch.
 */
export async function duplicateSeasonAction(
  sourceSeasonId: number,
  input: DuplicateSeasonInput,
): Promise<ActionResult & { code?: string }> {
  const user = await getCurrentUserOrRedirect();
  if (!canCreateSeason(user)) throw new ForbiddenError();

  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    return { ok: false, error: "Enter a valid year.", fieldErrors: { year: "Invalid year." } };
  }

  const source = await db.season.findUnique({
    where: { id: sourceSeasonId },
    select: {
      program: true,
      description: true,
      startDate: true,
      absenceBudgetMinutes: true,
      absenceWeightMinutes: true,
      groups: { select: { id: true, name: true, description: true } },
      sessions: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          durationMinutes: true,
          location: true,
          youtubeUrl: true,
          description: true,
          recurrenceGroupId: true,
        },
      },
      assignments: {
        where: { deletedAt: null },
        select: {
          title: true,
          description: true,
          dueAt: true,
          isAllGroups: true,
          type: true,
          forumMinWords: true,
          forumAllowComments: true,
          maxFileSizeMb: true,
          allowedMimeCategories: true,
          sessionId: true,
          targets: { select: { groupId: true } },
        },
      },
    },
  });
  if (!source) return { ok: false, error: "Season not found." };

  const parsedDates = duplicateDatesSchema.safeParse(input);
  if (!parsedDates.success) {
    return { ok: false, error: parsedDates.error.issues[0]?.message ?? "Invalid dates." };
  }

  const code = slugifySeasonCode(input.code || `${source.program} ${input.year}`);
  if (!isValidSeasonCode(code)) {
    return {
      ok: false,
      error: "Code must be lowercase letters, numbers, and dashes.",
      fieldErrors: { code: "Invalid." },
    };
  }
  const existingCode = await db.season.findUnique({ where: { code } });
  if (existingCode) {
    return {
      ok: false,
      error: "A season with that code already exists.",
      fieldErrors: { code: "Already in use." },
    };
  }

  const offsetMs = parsedDates.data.startDate.getTime() - source.startDate.getTime();
  const shift = (d: Date) => new Date(d.getTime() + offsetMs);
  const shiftNullable = (d: Date | null) => (d ? shift(d) : null);

  const newCode = await db.$transaction(async (tx) => {
    const season = await tx.season.create({
      data: {
        code,
        title: `${source.program} ${input.year}`,
        program: source.program,
        year: input.year,
        description: source.description,
        startDate: parsedDates.data.startDate,
        endDate: parsedDates.data.endDate,
        status: SeasonStatus.DRAFT,
        absenceBudgetMinutes: source.absenceBudgetMinutes,
        absenceWeightMinutes: source.absenceWeightMinutes,
        createdById: user.userId,
        updatedById: user.userId,
      },
      select: { id: true, code: true },
    });

    const groupIdMap = new Map<number, number>();
    for (const g of source.groups) {
      const newGroup = await tx.group.create({
        data: { seasonId: season.id, name: g.name, description: g.description },
        select: { id: true },
      });
      groupIdMap.set(g.id, newGroup.id);
    }

    const sessionIdMap = new Map<number, number>();
    for (const s of source.sessions) {
      const newSession = await tx.session.create({
        data: {
          seasonId: season.id,
          title: s.title,
          startsAt: shift(s.startsAt),
          durationMinutes: s.durationMinutes,
          location: s.location,
          youtubeUrl: s.youtubeUrl,
          description: s.description,
          recurrenceGroupId: s.recurrenceGroupId,
        },
        select: { id: true },
      });
      sessionIdMap.set(s.id, newSession.id);
    }

    for (const a of source.assignments) {
      const newAssignment = await tx.assignment.create({
        data: {
          seasonId: season.id,
          sessionId: a.sessionId ? (sessionIdMap.get(a.sessionId) ?? null) : null,
          title: a.title,
          description: a.description,
          dueAt: shiftNullable(a.dueAt),
          isAllGroups: a.isAllGroups,
          type: a.type,
          forumMinWords: a.forumMinWords,
          forumAllowComments: a.forumAllowComments,
          maxFileSizeMb: a.maxFileSizeMb,
          allowedMimeCategories: a.allowedMimeCategories,
          createdById: user.userId,
          updatedById: user.userId,
        },
        select: { id: true },
      });
      if (!a.isAllGroups && a.targets.length > 0) {
        const targetGroupIds = a.targets
          .map((t) => groupIdMap.get(t.groupId))
          .filter((id): id is number => id != null);
        if (targetGroupIds.length > 0) {
          await tx.assignmentTarget.createMany({
            data: targetGroupIds.map((groupId) => ({
              assignmentId: newAssignment.id,
              groupId,
            })),
          });
        }
      }
    }

    return season.code;
  });

  revalidatePath("/super/seasons");
  return { ok: true, code: newCode };
}
