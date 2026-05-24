"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required."),
    newPassword: z.string().min(8, "At least 8 characters."),
    confirm: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
  confirm: string,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const parsed = passwordSchema.safeParse({ currentPassword, newPassword, confirm });
  if (!parsed.success) return zodErrors(parsed.error);

  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { passwordHash: true },
  });
  if (!dbUser?.passwordHash) {
    return { ok: false, error: "No password set on this account." };
  }
  const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!ok) {
    return {
      ok: false,
      error: "Current password is incorrect.",
      fieldErrors: { currentPassword: "Incorrect." },
    };
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({
    where: { id: user.userId },
    data: { passwordHash: newHash },
  });
  return { ok: true };
}

export interface NotificationPrefsInput {
  assignmentCreated: boolean;
  submissionReviewed: boolean;
  sessionRescheduled: boolean;
  lowAttendanceFlag: boolean;
  mentorFollowup: boolean;
}

export async function updateNotificationPreferencesAction(
  prefs: NotificationPrefsInput,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  await db.notificationPreference.upsert({
    where: { userId: user.userId },
    update: { ...prefs },
    create: { userId: user.userId, ...prefs },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function updateOwnProfileAction(name: string): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  const parsed = profileSchema.safeParse({ name });
  if (!parsed.success) return zodErrors(parsed.error);
  await db.user.update({
    where: { id: user.userId },
    data: { name: parsed.data.name },
  });
  revalidatePath("/", "layout");
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
