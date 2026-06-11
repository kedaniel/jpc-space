import Link from "next/link";
import { Users, BookOpen, AlertTriangle, Shield } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeAtRiskStudents } from "@/lib/engagement";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

export default async function SuperDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const [userCount, activeSeasonCount, activeStudentCount] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.season.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
  ]);

  const activeSeason = await db.season.findFirst({
    where: { status: "ACTIVE", deletedAt: null },
    select: { id: true, title: true },
    orderBy: { startDate: "desc" },
  });
  const atRisk = activeSeason ? await computeAtRiskStudents(activeSeason.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Super Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Global system overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            { label: "Total users", value: userCount, href: "/super/users", icon: Users },
            { label: "Active seasons", value: activeSeasonCount, href: "/super/seasons", icon: BookOpen },
            { label: "Active students", value: activeStudentCount, href: "/super/students", icon: Shield },
          ] as const
        ).map(({ label, value, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          >
            <Icon className="mb-2 size-4 text-brand-teal-600" />
            <p className="text-2xl font-black text-brand-navy-900">{value}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            { label: "Users", href: "/super/users" },
            { label: "Seasons", href: "/super/seasons" },
            { label: "Students", href: "/super/students" },
            { label: "Events", href: "/super/events" },
          ] as const
        ).map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-brand-navy-900 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60 transition-all hover:ring-brand-teal-300 hover:text-brand-teal-700"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* At-risk students */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <AlertTriangle className="size-4 text-error-500" />
          <p className="text-sm font-bold text-brand-navy-900">Students at risk</p>
          {activeSeason && (
            <p className="ml-1 text-xs text-neutral-400">{activeSeason.title}</p>
          )}
          {atRisk.length > 0 && (
            <span className="ml-auto rounded-full bg-error-100 px-2 py-0.5 text-xs font-bold text-error-700">
              {atRisk.length}
            </span>
          )}
        </div>
        {!activeSeason ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={AlertTriangle}
              title="No active season"
              description="Create an active season to see at-risk data."
            />
          </div>
        ) : atRisk.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={AlertTriangle}
              title="No students at risk"
              description="All students are within their absence budget."
            />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {atRisk.map((s) => (
              <li key={s.userId}>
                <Link
                  href={`/super/students/${s.userId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-navy-900">{s.name}</p>
                    <p className="text-xs text-neutral-500">{s.absentCount} absent · {s.lateCount} late</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-error-600">+{s.minutesOver} min</p>
                    <p className="text-[10px] text-neutral-400">over budget</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
