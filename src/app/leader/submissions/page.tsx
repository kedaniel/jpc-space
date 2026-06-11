import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSubmissionsForLeader } from "@/lib/submissions-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Submissions</h1>
        <p className="mt-1 text-sm text-neutral-500">{`${pending} pending review · ${rows.length} total${lateCount > 0 ? ` · ${lateCount} late` : ""}`}</p>
      </div>
      <LeaderQueueList rows={rows} />
    </div>
  );
}
