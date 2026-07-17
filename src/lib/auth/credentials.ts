import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/enums";

export interface VerifiedUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Verify an email + password against a user record and stamp lastLoginAt.
 * Shared by the Auth.js credentials provider (web) and the token API (mobile),
 * so both logins behave identically. Returns null on any failure.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<VerifiedUser | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  if (user.deletedAt) return null;
  if (!user.passwordHash) return null; // invite not yet accepted

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
