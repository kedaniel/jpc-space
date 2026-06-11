import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { SeasonCalendar } from "@/components/sessions/season-calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export const metadata = { title: "Calendar" };

export default async function LeaderCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  if (user.groupLeaderIds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
          <p className="mt-1 text-sm text-neutral-500">You don&apos;t lead any groups yet.</p>
        </div>
        <EmptyState
          icon={Calendar}
          title="No calendar"
          description="An admin will add you to a group when you're ready."
        />
      </div>
    );
  }

  const groups = await db.group.findMany({
    where: { id: { in: user.groupLeaderIds } },
    select: { seasonId: true },
  });
  const seasonIds = Array.from(new Set(groups.map((g) => g.seasonId)));

  const [allSessions, jpcEvents] = await Promise.all([
    Promise.all(seasonIds.map((id) => listSessionsForSeason(id))).then((arr) =>
      arr.flat().sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    ),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
        <p className="mt-1 text-sm text-neutral-500">{`${allSessions.length} session${allSessions.length === 1 ? "" : "s"}`}</p>
      </div>
      <SeasonCalendar
        sessions={allSessions}
        jpcEvents={jpcEvents}
        sessionPathTemplate="/leader/sessions/{id}"
      />
    </div>
  );
}
