import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) {
    // Do not leak account existence; pretend success.
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.passwordResetToken.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(email, link);
  } catch (err) {
    // Never throw: preserve "do not leak account existence" — a transport
    // failure must not surface differently than an unknown-email submission.
    console.error(`[password-reset] failed to send email to ${email}:`, err);
  }
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  if (!rawToken || newPassword.length < 8) {
    throw new Error("Invalid token or password too short (min 8 chars).");
  }
  const tokenHash = hashToken(rawToken);
  const record = await db.passwordResetToken.findUnique({
    where: { token: tokenHash },
  });
  if (!record) throw new Error("Invalid or expired reset token.");
  if (record.usedAt) throw new Error("Reset token has already been used.");
  if (record.expiresAt < new Date()) throw new Error("Reset token has expired.");

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
