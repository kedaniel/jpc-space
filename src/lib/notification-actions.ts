"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { markRead } from "@/lib/notifications";

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  await markRead(user.userId);
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(id: number): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  await markRead(user.userId, [id]);
  revalidatePath("/", "layout");
}
