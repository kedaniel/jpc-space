import type { UserRole } from "@/generated/prisma/enums";

/** A graduated student (role STUDENT + graduationYear set) belongs in the /alumni portal. */
function isAlumnusLanding(role: UserRole, graduationYear: number | null): boolean {
  return role === "STUDENT" && graduationYear != null;
}

export function dashboardPathForRole(
  role: UserRole,
  graduationYear: number | null = null,
): string {
  if (isAlumnusLanding(role, graduationYear)) return "/alumni/dashboard";
  switch (role) {
    case "SUPER":
      return "/super/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "LEADER":
      return "/leader/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    case "MENTOR":
      return "/mentor/dashboard";
  }
}

export function rolePrefixAllowed(
  role: UserRole,
  pathname: string,
  graduationYear: number | null = null,
): boolean {
  if (role === "SUPER") return true;
  if (pathname.startsWith("/super")) return false;
  if (pathname.startsWith("/admin")) return role === "ADMIN";
  if (pathname.startsWith("/leader")) return role === "LEADER";
  if (pathname.startsWith("/mentor")) return role === "MENTOR";
  // Alumni (graduated students) use /alumni and lose access to active-student pages.
  if (pathname.startsWith("/alumni")) return isAlumnusLanding(role, graduationYear);
  if (pathname.startsWith("/student")) {
    return role === "STUDENT" && !isAlumnusLanding(role, graduationYear);
  }
  return true;
}
