import * as React from "react";

import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { navFor } from "@/lib/navigation";
import type { SessionUser } from "@/lib/rbac";
import { TopBar } from "@/components/layout/top-bar";
import { ShellFrame } from "@/components/layout/shell-frame";
import { listRecent, unreadCount } from "@/lib/notifications";
import { markAllNotificationsReadAction } from "@/lib/notification-actions";
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

function initialsFor(user: SessionUser): string {
  return user.role.charAt(0).toUpperCase();
}

function notificationsHrefFor(user: SessionUser): string {
  switch (user.role) {
    case "SUPER":
      return "/super/notifications";
    case "ADMIN":
      return "/admin/notifications";
    case "LEADER":
      return "/leader/notifications";
    case "MENTOR":
      return "/mentor/notifications";
    case "STUDENT":
      return "/student/notifications";
  }
}

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

async function AppShell({ user, children }: AppShellProps) {
  const nav = navFor(user);
  const isDev = process.env.DEV_USER_SWITCHER === "1";
  const [notifications, unread, devUsers, currentUser] = await Promise.all([
    listRecent(user.userId, 8),
    unreadCount(user.userId),
    isDev
      ? db.user.findMany({
          where: { deletedAt: null },
          select: { id: true, email: true, name: true, role: true },
          orderBy: [{ role: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
    db.user.findUnique({ where: { id: user.userId }, select: { avatarPath: true } }),
  ]);

  const storage = getStorage();
  const avatarUrl = currentUser?.avatarPath
    ? await storage.url(currentUser.avatarPath)
    : null;

  return (
    <ShellFrame
      sidebarItems={nav.sidebar}
      tabItems={nav.tabs}
      topBar={
        <TopBar
          role={user.role}
          userId={user.userId}
          initials={initialsFor(user)}
          avatarUrl={avatarUrl}
          signOutAction={signOutAction}
          notifications={notifications}
          unreadCount={unread}
          notificationsHref={notificationsHrefFor(user)}
          markAllNotificationsReadAction={markAllNotificationsReadAction}
          devSwitcher={
            isDev ? (
              <DevUserSwitcher users={devUsers} currentUserId={user.userId} />
            ) : null
          }
        />
      }
    >
      {children}
    </ShellFrame>
  );
}

export { AppShell };
