import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { Button } from "@/components/ui/button";
import { SeasonCalendar } from "@/components/sessions/season-calendar";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Calendar · ${code}` };
}

export default async function AdminCalendarPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const createHref = `/admin/season/${season.code}/calendar/new`;

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForSeason(season.id),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
          <p className="mt-1 text-sm text-neutral-500">{`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}</p>
        </div>
        <Button render={<Link href={createHref} />}>Add session</Button>
      </div>
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        sessionPathTemplate="/admin/season/{seasonCode}/sessions/{id}"
      />
    </div>
  );
}
