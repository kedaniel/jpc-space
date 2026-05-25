import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadReportsData } from "@/lib/reports-query";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports" };

export default async function SuperReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const data = await loadReportsData({ seasonIds: [] });

  return (
    <>
      <PageHeader title="Reports" description="All seasons, all groups." />
      <ReportsView
        data={data}
        exportCsvHref="/api/reports/export"
        studentDetailBase="/super/students"
      />
    </>
  );
}
