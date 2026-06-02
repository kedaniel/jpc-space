import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { loadScopes } from "@/lib/auth/scopes";
import type { UserRole } from "@/generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const isDev = process.env.DEV_USER_SWITCHER === "1";

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  authorize: async (raw) => {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const { email, password } = parsed.data;

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

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

const devSwitchSchema = z.object({ email: z.string().email() });

const devSwitchProvider = Credentials({
  id: "dev-switch",
  name: "Dev Switch",
  credentials: { email: { label: "Email", type: "email" } },
  authorize: async (raw) => {
    if (!isDev) return null;
    const parsed = devSwitchSchema.safeParse(raw);
    if (!parsed.success) return null;

    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return null;
    if (user.deletedAt) return null;

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: isDev ? [credentialsProvider, devSwitchProvider] : [credentialsProvider],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = Number(user.id);
        token.role = (user as { role: UserRole }).role;
      }
      if (token.userId && (trigger === "signIn" || trigger === "update" || !("seasonAdminIds" in token))) {
        const scopes = await loadScopes(token.userId as number);
        token.seasonAdminIds = scopes.seasonAdminIds;
        token.groupLeaderIds = scopes.groupLeaderIds;
        token.activeSeasonId = scopes.activeSeasonId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.userId = (token.userId as number | undefined) ?? 0;
      session.user.role = (token.role as UserRole | undefined) ?? "STUDENT";
      session.user.seasonAdminIds = token.seasonAdminIds ?? [];
      session.user.groupLeaderIds = token.groupLeaderIds ?? [];
      session.user.activeSeasonId = token.activeSeasonId ?? null;
      return session;
    },
  },
});

