import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSubmissionsForLeader } from "@/lib/submissions-query";
import { PageHeader } from "@/components/layout/page-header";
import { LeaderQueueList } from "@/components/assignments/leader-queue-list";

export const metadata = { title: "Submissions" };

export default async function LeaderSubmissionsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  const rows = await listSubmissionsForLeader(user.groupLeaderIds);
  const pending = rows.filter((r) => r.status === "SUBMITTED").length;
  const lateCount = rows.filter(
    (r) => r.submittedAt != null && r.assignmentDueAt != null && r.submittedAt > r.assignmentDueAt,
  ).length;

  return (
    <>
      <PageHeader
        title="Submissions"
        description={`${pending} pending review آ· ${rows.length} total${lateCount > 0 ? ` · ${lateCount} late` : ""}`}
      />
      <LeaderQueueList rows={rows} />
    </>
  );
}
