"use client";

import { HelpCircle, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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

function deriveTitle(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (/^\d+$/.test(part)) continue;
    return part
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return "";
}

interface TopBarProps {
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
  role,
  userId,
  initials,
  signOutAction,
  notifications,
  unreadCount,
  notificationsHref,
  markAllNotificationsReadAction,
}: TopBarProps) {
  const pathname = usePathname();
  const title = deriveTitle(pathname ?? "");
  return (
    <header className="jpc-glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="md:hidden">
          <Logo size="sm" />
        </div>
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
          {title}
        </h1>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <div className="relative w-full max-w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search community…"
            className="h-10 pl-9 pr-16"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Badge role={roleColor[role]} className="hidden md:inline-flex">
          {role}
        </Badge>
        <ThemeToggle />
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
        <div className="mx-1 hidden h-6 w-px bg-border md:block" />
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
