import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { StatCard } from "@/components/students/stat-card";
import { UpcomingEventsCard } from "@/components/events/upcoming-events-card";

export const metadata = { title: "Dashboard" };

export default async function SuperDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const now = new Date();
  const [seasonCount, studentCount, alumniCount, eventCount] = await Promise.all([
    db.season.count({ where: { deletedAt: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: { not: null } } }),
    db.jpcEvent.count({ where: { date: { gte: now } } }),
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
        <StatCard label="Seasons" value={seasonCount} href="/super/seasons" />
        <StatCard label="Upcoming events" value={eventCount} href="/super/events" />
      </div>

      {/* Upcoming JPC events */}
      <UpcomingEventsCard user={user} />
    </div>
  );
}
