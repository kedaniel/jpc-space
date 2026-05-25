import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadAttendanceRoster, loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceForm } from "@/components/sessions/attendance-form";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export const metadata: Metadata = { title: "Attendance" };

export default async function SessionAttendancePage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  const session = await loadSessionById(Number(id));
  if (session.seasonId !== season.id) redirect(`/admin/season/${season.code}/calendar`);
  if (!(await canMarkAttendance(user, session.id))) redirect(`/admin/season/${season.code}/calendar`);

  const roster = await loadAttendanceRoster(session.id);

  return (
    <>
      <PageHeader
        title={`Attendance — ${session.title}`}
        description={format(session.startsAt, "EEE, MMM d, yyyy · h:mm a")}
      />
      <AttendanceForm
        sessionId={session.id}
        roster={roster}
        returnHref={`/admin/season/${season.code}/sessions/${session.id}`}
      />
    </>
  );
}
