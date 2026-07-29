import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardPathForRole } from "@/lib/auth/post-login";
import { isAlumnus } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";

interface RoleLayoutProps {
  allowedRoles: UserRole[];
  /** The /alumni area: allow graduated students (role STUDENT + graduationYear) only. */
  alumniArea?: boolean;
  children: ReactNode;
}

export async function RoleLayout({ allowedRoles, alumniArea, children }: RoleLayoutProps) {
  const user = await getCurrentUserOrRedirect();

  if (alumniArea) {
    if (!isAlumnus(user)) redirect(dashboardPathForRole(user.role, user.graduationYear));
    return <AppShell user={user}>{children}</AppShell>;
  }

  // An alumnus keeps role STUDENT, so guard the active-student area explicitly:
  // send them to the read-only alumni portal instead of the active-student shell.
  if (isAlumnus(user)) {
    redirect("/alumni/dashboard");
  }
  if (!allowedRoles.includes(user.role)) {
    redirect(dashboardPathForRole(user.role, user.graduationYear));
  }
  return <AppShell user={user}>{children}</AppShell>;
}
