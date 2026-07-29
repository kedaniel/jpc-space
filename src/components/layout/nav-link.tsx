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
  PenLine,
  Settings,
  Sparkles,
  User,
  UserCheck,
  UserMinus,
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
  alumni: UserCheck,
  dropped: UserMinus,
  notes: Notebook,
  quizzes: PenLine,
  more: MoreHorizontal,
  settings: Settings,
};

interface NavLinkProps {
  href: string;
  label: string;
  icon: NavIconName;
  variant: "sidebar" | "tab";
  compact?: boolean;
  /** Tab variant only — renders a prominent teal center button (the Home tab). */
  featured?: boolean;
}

function NavLink({ href, label, icon, variant, compact = false, featured = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = iconMap[icon];

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className="relative flex flex-1 flex-col items-center justify-center gap-1 self-stretch px-1"
      >
        <span
          className={cn(
            "relative flex size-9 items-center justify-center rounded-full",
            featured && "bg-brand-teal-500 text-brand-navy-950 shadow-[var(--shadow-soft)]",
          )}
        >
          {!featured && isActive ? (
            <motion.span
              layoutId="nav-tab-active"
              transition={springSoft}
              className="absolute inset-0 rounded-full bg-white/15"
            />
          ) : null}
          <Icon
            className={cn(
              "relative size-5 transition-colors",
              featured
                ? "text-brand-navy-950"
                : isActive
                  ? "text-white"
                  : "text-white/55",
            )}
          />
        </span>
        <span
          className={cn(
            "max-w-full truncate text-[10px] font-medium leading-none transition-colors",
            isActive ? "text-white" : featured ? "text-white/80" : "text-white/55",
          )}
        >
          {label}
        </span>
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
