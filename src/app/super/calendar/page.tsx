import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForAllActiveSeasons } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { SEASON_PALETTE, SeasonCalendar } from "@/components/sessions/season-calendar";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Calendar" };

export default async function SuperCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForAllActiveSeasons(),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  // Build color map keyed by seasonCode, cycling through palette
  const seasonCodes = Array.from(new Set(sessions.map((s) => s.seasonCode)));
  const seasonColors: Record<string, string> = {};
  seasonCodes.forEach((code, i) => {
    seasonColors[code] = SEASON_PALETTE[i % SEASON_PALETTE.length]!;
  });

  return (
    <>
      <PageHeader title="Calendar" description="All active seasons across JPC." />
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        sessionPathTemplate="/admin/season/{seasonCode}/sessions/{id}"
        seasonColors={seasonColors}
      />
    </>
  );
}
