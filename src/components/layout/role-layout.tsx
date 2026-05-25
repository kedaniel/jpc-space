import type { ReactNode } from "react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import type { UserRole } from "@/generated/prisma/enums";

interface RoleLayoutProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export async function RoleLayout({ allowedRoles, children }: RoleLayoutProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, allowedRoles);
  return <AppShell user={user}>{children}</AppShell>;
}
