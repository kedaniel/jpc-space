import * as React from "react";

import { signOut } from "@/lib/auth";
import { navFor } from "@/lib/navigation";
import type { SessionUser } from "@/lib/rbac";
import { NavLink } from "@/components/layout/nav-link";
import { TopBar } from "@/components/layout/top-bar";
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
  title: string;
  children: React.ReactNode;
}

async function AppShell({ user, title, children }: AppShellProps) {
  const nav = navFor(user);
  const [notifications, unread] = await Promise.all([
    listRecent(user.userId, 8),
    unreadCount(user.userId),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50 md:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-brand-navy-900 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-brand-navy-800 px-5">
          <span className="text-lg font-semibold text-white">JPC Portal</span>
        </div>
        <nav
          aria-label="Primary"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        >
          {nav.sidebar.map((item) => (
            <NavLink key={item.href} {...item} variant="sidebar" />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          role={user.role}
          userId={user.userId}
          initials={initialsFor(user)}
          signOutAction={signOutAction}
          notifications={notifications}
          unreadCount={unread}
          notificationsHref={notificationsHrefFor(user)}
          markAllNotificationsReadAction={markAllNotificationsReadAction}
        />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
          {children}
        </main>

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white px-2 py-1 md:hidden"
        >
          {nav.tabs.slice(0, 5).map((item) => (
            <NavLink key={item.href} {...item} variant="tab" />
          ))}
        </nav>
      </div>
    </div>
  );
}

export { AppShell };
