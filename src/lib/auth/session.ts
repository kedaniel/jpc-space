import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user || !session.user.userId) return null;
  return {
    userId: session.user.userId,
    role: session.user.role,
    seasonAdminIds: session.user.seasonAdminIds ?? [],
    groupLeaderIds: session.user.groupLeaderIds ?? [],
    activeSeasonId: session.user.activeSeasonId ?? null,
    graduationYear: session.user.graduationYear ?? null,
  };
}

export async function getCurrentUserOrRedirect(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
