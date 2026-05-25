import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CalendarList } from "@/components/sessions/calendar-list";

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

  const sessions = await listSessionsForSeason(season.id);
  const createHref = `/admin/season/${season.code}/calendar/new`;

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
        actions={<Button render={<Link href={createHref} />}>Add session</Button>}
      />
      <CalendarList
        sessions={sessions}
        basePath={`/admin/season/${season.code}/sessions`}
        createHref={createHref}
        showAttendanceLink
      />
    </>
  );
}
