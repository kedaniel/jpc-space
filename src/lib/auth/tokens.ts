import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { loadScopes } from "@/lib/auth/scopes";
import type { SessionUser } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";

const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUDIENCE = "jpc-mobile";

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signAccessToken(
  user: SessionUser,
): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({
    role: user.role,
    seasonAdminIds: user.seasonAdminIds,
    groupLeaderIds: user.groupLeaderIds,
    activeSeasonId: user.activeSeasonId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setAudience(AUDIENCE)
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secret());
  return { token, expiresIn: ACCESS_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: AUDIENCE });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return {
      userId,
      role: payload.role as UserRole,
      seasonAdminIds: (payload.seasonAdminIds as number[] | undefined) ?? [],
      groupLeaderIds: (payload.groupLeaderIds as number[] | undefined) ?? [],
      activeSeasonId: (payload.activeSeasonId as number | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function issueRefreshToken(
  userId: number,
  userAgent?: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.refreshToken.create({
    data: { tokenHash: hashToken(raw), userId, expiresAt, userAgent: userAgent ?? null },
  });
  return { token: raw, expiresAt };
}

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

/** Build a SessionUser from the DB (current scopes) and mint access + refresh tokens. */
export async function issueSession(
  userId: number,
  userAgent?: string | null,
): Promise<{ session: IssuedSession; user: SessionUser } | null> {
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!dbUser || dbUser.deletedAt) return null;

  const scopes = await loadScopes(dbUser.id);
  const user: SessionUser = { userId: dbUser.id, role: dbUser.role, ...scopes };
  const access = await signAccessToken(user);
  const refresh = await issueRefreshToken(user.userId, userAgent);
  return {
    session: {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
    },
    user,
  };
}

/** Rotate a refresh token: validate, revoke the old one, and issue a fresh session. */
export async function rotateRefreshToken(
  rawToken: string,
  userAgent?: string | null,
): Promise<IssuedSession | null> {
  const record = await db.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;

  await db.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const issued = await issueSession(record.userId, userAgent);
  return issued?.session ?? null;
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
