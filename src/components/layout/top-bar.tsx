"use client";

import { HelpCircle, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/layout/user-menu";
import {
  NotificationBell,
  type NotificationBellItem,
} from "@/components/layout/notification-bell";
import type { UserRole } from "@/generated/prisma/enums";

type RoleColor = "super" | "admin" | "leader" | "mentor" | "student";

const roleColor: Record<UserRole, RoleColor> = {
  SUPER: "super",
  ADMIN: "admin",
  LEADER: "leader",
  MENTOR: "mentor",
  STUDENT: "student",
};

interface TopBarProps {
  title: string;
  role: UserRole;
  userId: number;
  initials: string;
  signOutAction: () => Promise<void>;
  notifications: NotificationBellItem[];
  unreadCount: number;
  notificationsHref: string;
  markAllNotificationsReadAction: () => Promise<void>;
}

export function TopBar({
  title,
  role,
  userId,
  initials,
  signOutAction,
  notifications,
  unreadCount,
  notificationsHref,
  markAllNotificationsReadAction,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-base font-semibold text-neutral-900 md:text-lg">
          {title}
        </h1>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <div className="relative w-full max-w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            placeholder="Search…"
            className="h-10 pl-9 pr-16"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 md:inline-flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Badge role={roleColor[role]} className="hidden md:inline-flex">
          {role}
        </Badge>
        <NotificationBell
          items={notifications}
          unread={unreadCount}
          viewAllHref={notificationsHref}
          onMarkAllRead={markAllNotificationsReadAction}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Help"
          className="hidden md:inline-flex"
        >
          <HelpCircle />
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-neutral-200 md:block" />
        <UserMenu
          role={role}
          userId={userId}
          initials={initials}
          signOutAction={signOutAction}
        />
      </div>
    </header>
  );
}
