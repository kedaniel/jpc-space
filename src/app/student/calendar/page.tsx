import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarList } from "@/components/sessions/calendar-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export const metadata = { title: "Calendar" };

export default async function StudentCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  if (!user.activeSeasonId) {
    return (
      <>
        <PageHeader title="Calendar" description="You aren't enrolled in an active season." />
        <EmptyState
          icon={Calendar}
          title="No active season"
          description="An admin will enroll you in a season when you're ready."
        />
      </>
    );
  }

  const sessions = await listSessionsForSeason(user.activeSeasonId);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${sessions.length} session${sessions.length === 1 ? "" : "s"} in your current season`}
      />
      <CalendarList sessions={sessions} basePath="/student/sessions" />
    </>
  );
}
