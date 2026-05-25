import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarList } from "@/components/sessions/calendar-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export const metadata = { title: "Calendar" };

export default async function LeaderCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  if (user.groupLeaderIds.length === 0) {
    return (
      <>
        <PageHeader title="Calendar" description="You don't lead any groups yet." />
        <EmptyState
          icon={Calendar}
          title="No calendar"
          description="An admin will add you to a group when you're ready."
        />
      </>
    );
  }

  const groups = await db.group.findMany({
    where: { id: { in: user.groupLeaderIds } },
    select: { seasonId: true },
  });
  const seasonIds = Array.from(new Set(groups.map((g) => g.seasonId)));
  const sessions = (
    await Promise.all(seasonIds.map((id) => listSessionsForSeason(id)))
  ).flat().sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
      />
      <CalendarList
        sessions={sessions}
        basePath="/leader/sessions"
        showAttendanceLink
      />
    </>
  );
}
