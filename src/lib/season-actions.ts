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
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum([
      SeasonStatus.DRAFT,
      SeasonStatus.ACTIVE,
      SeasonStatus.COMPLETED,
      SeasonStatus.ARCHIVED,
    ]),
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
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: SeasonStatus;
}

export async function createSeasonAction(
  input: SeasonInput,
): Promise<ActionResult & { code?: string }> {
  const user = await getCurrentUserOrRedirect();
  if (!canCreateSeason(user)) throw new ForbiddenError();

  const code = slugifySeasonCode(input.code || input.title);
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
      title: parsed.data.title,
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
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
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
