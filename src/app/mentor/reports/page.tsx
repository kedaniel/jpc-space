import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadReportsData } from "@/lib/reports-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports" };

export default async function MentorReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);

  const data = await loadReportsData({ seasonIds: [] });

  return (
    <AppShell user={user} title="Reports">
      <PageHeader
        title="Reports"
        description="Cross-season pastoral view — engagement patterns and at-risk students."
      />
      <ReportsView
        data={data}
        exportCsvHref="/api/reports/export"
        studentDetailBase="/mentor/students"
      />
    </AppShell>
  );
}
