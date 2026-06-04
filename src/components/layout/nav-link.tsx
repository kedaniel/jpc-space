"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  FileText,
  Folders,
  GraduationCap,
  History,
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

import { cn } from "@/lib/utils";
import { springSoft } from "@/lib/motion";
import type { NavIconName } from "@/lib/navigation";

const iconMap: Record<NavIconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  users: Users,
  calendar: Calendar,
  events: CalendarDays,
  assignments: ClipboardList,
  submissions: FileText,
  history: History,
  profile: User,
  reports: FileText,
  groups: Folders,
  season: Sparkles,
  students: GraduationCap,
  notes: Notebook,
  more: MoreHorizontal,
  settings: Settings,
};

interface NavLinkProps {
  href: string;
  label: string;
  icon: NavIconName;
  variant: "sidebar" | "tab";
  compact?: boolean;
}

function NavLink({ href, label, icon, variant, compact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = iconMap[icon];

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {isActive ? (
          <motion.span
            layoutId="nav-tab-active"
            transition={springSoft}
            className="absolute inset-x-3 top-1 h-[3px] rounded-full bg-brand-teal-500"
          />
        ) : null}
        <Icon className="size-5" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center rounded-lg text-sm font-medium transition-colors",
        compact ? "justify-center p-2" : "gap-3 px-4 py-3",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-white/70 hover:bg-sidebar-accent hover:text-white",
      )}
      title={compact ? label : undefined}
    >
      <Icon className={cn("shrink-0", compact ? "size-6" : "size-5")} />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
}

export { NavLink };
