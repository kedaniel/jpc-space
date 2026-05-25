import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  FileText,
  Folders,
  GraduationCap,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Notebook,
  Settings,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import { signOut } from "@/lib/auth";
import { navFor, type NavIconName, type NavItem } from "@/lib/navigation";
import type { SessionUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PageHeader } from "@/components/layout/page-header";

const iconMap: Record<NavIconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  users: Users,
  calendar: Calendar,
  assignments: ClipboardList,
  submissions: FileText,
  history: FileText,
  profile: User,
  reports: FileText,
  groups: Folders,
  season: Sparkles,
  students: GraduationCap,
  notes: Notebook,
  more: MoreHorizontal,
  settings: Settings,
};

type RoleColor = "super" | "admin" | "leader" | "mentor" | "student";
const roleColor: Record<SessionUser["role"], RoleColor> = {
  SUPER: "super",
  ADMIN: "admin",
  LEADER: "leader",
  MENTOR: "mentor",
  STUDENT: "student",
};

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

function extraItemsFor(user: SessionUser): NavItem[] {
  const { sidebar, tabs } = navFor(user);
  const tabHrefs = new Set(tabs.map((t) => t.href));
  return sidebar.filter((item) => !tabHrefs.has(item.href));
}

interface MoreMenuProps {
  user: SessionUser;
}

function MoreMenu({ user }: MoreMenuProps) {
  const items = extraItemsFor(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="More" description="Account, settings, and more places to go." />

      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground">
          {user.role.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-muted-foreground">User #{user.userId}</span>
          <Badge role={roleColor[user.role]} className="w-fit">
            {user.role}
          </Badge>
        </div>
      </section>

      {items.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent md:px-6 md:py-4"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Appearance</span>
          <span className="text-xs text-muted-foreground">Switch between light and dark.</span>
        </div>
        <ThemeToggle size="icon" />
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-error-700 shadow-[var(--shadow-soft)] transition-colors hover:bg-error-50 dark:text-error-200 dark:hover:bg-error-950 md:p-6"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

export { MoreMenu };
