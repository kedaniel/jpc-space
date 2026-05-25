import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canMarkAttendance } from "@/lib/auth/permissions";
import { loadAttendanceRoster, loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
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
    <>
      <PageHeader
        title={`Attendance — ${session.title}`}
        description={format(session.startsAt, "EEE, MMM d, yyyy · h:mm a")}
      />
      <AttendanceForm
        sessionId={session.id}
        roster={roster}
        returnHref="/leader/calendar"
      />
    </>
  );
}
