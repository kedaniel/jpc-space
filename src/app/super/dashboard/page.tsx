import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { StatCard } from "@/components/students/stat-card";
import { UpcomingEventsCard } from "@/components/events/upcoming-events-card";

export const metadata = { title: "Dashboard" };

export default async function SuperDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const [userCount, activeSeasonCount, studentCount, alumniCount] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.season.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: { not: null } } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Super Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global system overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Students" value={studentCount} href="/super/students" />
        <StatCard label="Alumni" value={alumniCount} href="/super/students/alumni" variant="teal" />
        <StatCard label="Active seasons" value={activeSeasonCount} href="/super/seasons" />
        <StatCard label="Total users" value={userCount} href="/super/users" />
      </div>

      {/* Upcoming JPC events */}
      <UpcomingEventsCard user={user} />

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
            className="rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm font-bold text-brand-navy-900 shadow-[var(--shadow-soft)] transition-all hover:border-brand-teal-300 hover:text-brand-teal-700 dark:text-foreground dark:hover:text-brand-teal-300"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
