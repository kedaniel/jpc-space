import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadReportsData } from "@/lib/reports-query";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports" };

export default async function MentorReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);

  const data = await loadReportsData({ seasonIds: [] });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Cross-season pastoral view â€” engagement patterns and at-risk students."
      />
      <ReportsView
        data={data}
        exportCsvHref="/api/reports/export"
        studentDetailBase="/mentor/students"
      />
    </>
  );
}
