import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSubmissionsForLeader } from "@/lib/submissions-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LeaderQueueList } from "@/components/assignments/leader-queue-list";

export const metadata = { title: "Submissions" };

export default async function LeaderSubmissionsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  const rows = await listSubmissionsForLeader(user.groupLeaderIds);
  const pending = rows.filter((r) => r.status === "SUBMITTED").length;

  return (
    <AppShell user={user} title="Submissions">
      <PageHeader
        title="Submissions"
        description={`${pending} pending review · ${rows.length} total`}
      />
      <LeaderQueueList rows={rows} />
    </AppShell>
  );
}
