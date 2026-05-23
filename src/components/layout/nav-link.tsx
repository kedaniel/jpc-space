"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
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
import type { NavIconName } from "@/lib/navigation";

const iconMap: Record<NavIconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  users: Users,
  calendar: Calendar,
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
}

function NavLink({ href, label, icon, variant }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = iconMap[icon];

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
          isActive
            ? "text-brand-teal-600"
            : "text-neutral-500 hover:text-neutral-900"
        )}
      >
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
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-brand-navy-800 text-white before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-brand-teal-500"
          : "text-white/70 hover:bg-brand-navy-800/60 hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export { NavLink };
