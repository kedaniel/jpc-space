import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { loadSessionById } from "@/lib/sessions-query";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Leader's session detail isn't a separate UI yet — redirect to attendance, which is
// the only thing a leader needs to do on a session page. The detail view is admin-only.
export default async function LeaderSessionDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);
  const { id } = await params;
  const session = await loadSessionById(Number(id));
  if (await canMarkAttendance(user, session.id)) {
    redirect(`/leader/sessions/${session.id}/attendance`);
  }
  redirect("/leader/calendar");
}
