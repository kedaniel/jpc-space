import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadReportsData } from "@/lib/reports-query";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = { title: "Reports" };

export default async function MentorReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);

  const data = await loadReportsData({ seasonIds: [] });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cross-season pastoral view - engagement patterns and at-risk students.
        </p>
      </div>
      <ReportsView
        data={data}
        exportCsvHref="/api/reports/export"
        studentDetailBase="/mentor/students"
      />
    </div>
  );
}
