"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isSuper } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";

export type ActionResult =
  | { ok: true; userId?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const userSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum([
    UserRole.SUPER,
    UserRole.ADMIN,
    UserRole.LEADER,
    UserRole.STUDENT,
    UserRole.MENTOR,
  ]),
});

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

export async function createUserAction(input: CreateUserInput): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      ok: false,
      error: "Email already in use.",
      fieldErrors: { email: "Already in use." },
    };
  }

  const tempPassword = "ChangeMe123!";
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash,
      ...(parsed.data.role === UserRole.STUDENT
        ? { studentProfile: { create: {} } }
        : {}),
    },
    select: { id: true },
  });

  console.log(
    `[user] Created ${parsed.data.email} (${parsed.data.role}) with temp password ${tempPassword}.`,
  );

  revalidatePath("/super/users");
  return { ok: true, userId: created.id };
}

export async function updateUserAction(
  userId: number,
  name: string,
  role: UserRole,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  await db.user.update({
    where: { id: userId },
    data: { name, role },
  });
  revalidatePath("/super/users");
  return { ok: true };
}

export async function deactivateUserAction(userId: number): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();
  if (user.userId === userId) return; // can't deactivate yourself

  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/super/users");
  redirect("/super/users");
}

export async function reactivateUserAction(userId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });
  revalidatePath("/super/users");
  return { ok: true };
}

function zodErrors(err: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}
