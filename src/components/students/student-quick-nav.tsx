import Link from "next/link";
import { Calendar, FileText, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/student/calendar", icon: Calendar, label: "Calendar" },
  { href: "/student/assignments", icon: FileText, label: "Assignments" },
  { href: "/student/history", icon: Sparkles, label: "History" },
  { href: "/student/profile", icon: User, label: "Profile" },
] as const;

export function StudentQuickNav({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {NAV_LINKS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-navy-50 text-brand-navy-700">
            <Icon className="size-4" />
          </span>
          <span className="text-xs font-semibold text-brand-navy-900">{label}</span>
        </Link>
      ))}
    </div>
  );
}
