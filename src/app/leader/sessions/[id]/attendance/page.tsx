import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canMarkAttendance } from "@/lib/auth/permissions";
import { loadAttendanceRoster, loadSessionById } from "@/lib/sessions-query";
import { AttendanceForm } from "@/components/sessions/attendance-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Attendance" };

export default async function LeaderAttendancePage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);
  const { id } = await params;
  const session = await loadSessionById(Number(id));
  if (!(await canMarkAttendance(user, session.id))) redirect("/leader/calendar");

  // Leaders only see their own group(s) on the roster.
  const roster = await loadAttendanceRoster(session.id, user.groupLeaderIds);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{`Attendance — ${session.title}`}</h1>
        <p className="mt-1 text-sm text-neutral-500">{format(session.startsAt, "EEE, MMM d, yyyy · h:mm a")}</p>
      </div>
      <AttendanceForm
        sessionId={session.id}
        roster={roster}
        returnHref="/leader/calendar"
      />
    </div>
  );
}
