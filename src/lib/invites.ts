"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { customAlphabet } from "nanoid";

const tokenAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateToken = customAlphabet(tokenAlphabet, 32);

const DEFAULT_TTL_HOURS = 72;

function ttlHours(): number {
  const raw = process.env.INVITE_TOKEN_TTL_HOURS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_HOURS;
}

export async function createInvite(userId: number, invitedById: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlHours() * 60 * 60 * 1000);
  await db.inviteToken.create({
    data: { token, userId, invitedById, expiresAt },
  });

  const [invitee, inviter] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true } }),
    db.user.findUnique({ where: { id: invitedById }, select: { name: true } }),
  ]);

  if (invitee?.email) {
    const base = process.env.AUTH_URL ?? "http://localhost:3000";
    const link = `${base}/accept-invite?token=${token}`;
    try {
      await sendInviteEmail(invitee.email, link, inviter?.name);
    } catch (err) {
      console.error(`[invites] failed to send invite email to ${invitee.email}:`, err);
    }
  }

  return { token, expiresAt };
}

export type AcceptInviteResult =
  | { ok: true; userId: number }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak_password" };

export async function acceptInvite(token: string, password: string): Promise<AcceptInviteResult> {
  if (password.length < 8) return { ok: false, reason: "weak_password" };

  const invite = await db.inviteToken.findUnique({ where: { token } });
  if (!invite) return { ok: false, reason: "invalid" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt < new Date()) return { ok: false, reason: "expired" };

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: invite.userId },
      data: { passwordHash },
    }),
    db.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, userId: invite.userId };
}
