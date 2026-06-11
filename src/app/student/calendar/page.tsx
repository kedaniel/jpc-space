import { Calendar } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { SeasonCalendar } from "@/components/sessions/season-calendar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Calendar" };

export default async function StudentCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  if (!user.activeSeasonId) {
    return (
      <div className="flex flex-col gap-3 md:gap-4">
        <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
        <EmptyState
          icon={Calendar}
          title="No active season"
          description="An admin will enroll you in a season when you're ready."
        />
      </div>
    );
  }

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForSeason(user.activeSeasonId),
    listJpcEvents({ includeAlumniOnly: false }),
  ]);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        sessionPathTemplate="/student/sessions/{id}"
      />
    </div>
  );
}
