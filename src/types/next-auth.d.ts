import type { UserRole } from "@/generated/prisma/enums";

declare module "@auth/core/types" {
  interface Session {
    user: {
      userId: number;
      role: UserRole;
      seasonAdminIds: number[];
      groupLeaderIds: number[];
      activeSeasonId: number | null;
      graduationYear: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: number;
    role?: UserRole;
    seasonAdminIds?: number[];
    groupLeaderIds?: number[];
    activeSeasonId?: number | null;
    graduationYear?: number | null;
  }
}
