import * as React from "react";

import { signOut } from "@/lib/auth";
import { navFor } from "@/lib/navigation";
import type { SessionUser } from "@/lib/rbac";
import { TopBar } from "@/components/layout/top-bar";
import { ShellFrame } from "@/components/layout/shell-frame";
import { listRecent, unreadCount } from "@/lib/notifications";
import { markAllNotificationsReadAction } from "@/lib/notification-actions";

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
  const [notifications, unread] = await Promise.all([
    listRecent(user.userId, 8),
    unreadCount(user.userId),
  ]);

  return (
    <ShellFrame
      sidebarItems={nav.sidebar}
      tabItems={nav.tabs}
      topBar={
        <TopBar
          role={user.role}
          userId={user.userId}
          initials={initialsFor(user)}
          signOutAction={signOutAction}
          notifications={notifications}
          unreadCount={unread}
          notificationsHref={notificationsHrefFor(user)}
          markAllNotificationsReadAction={markAllNotificationsReadAction}
        />
      }
    >
      {children}
    </ShellFrame>
  );
}

export { AppShell };
