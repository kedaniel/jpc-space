import type { UserRole } from "@/generated/prisma/enums";

/** Roles that may only be held by an alumnus (a user with a graduationYear). */
export const ALUMNI_ONLY_ROLES: UserRole[] = ["LEADER", "ADMIN", "MENTOR"];

/** Whether the given role requires the user to be an alumnus (graduated from JPCS). */
export function roleRequiresAlumnus(role: UserRole): boolean {
  return ALUMNI_ONLY_ROLES.includes(role);
}
