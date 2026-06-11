import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadAttendanceRoster, loadSessionById } from "@/lib/sessions-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{`Attendance — ${session.title}`}</h1>
        <p className="mt-1 text-sm text-neutral-500">{format(session.startsAt, "EEE, MMM d, yyyy · h:mm a")}</p>
      </div>
      <AttendanceForm
        sessionId={session.id}
        roster={roster}
        returnHref={`/admin/season/${season.code}/sessions/${session.id}`}
      />
    </div>
  );
}
