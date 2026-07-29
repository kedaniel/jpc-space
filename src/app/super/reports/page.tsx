import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSuperReports, type SeasonEnrollmentCount } from "@/lib/super-reports-query";
import { StatCard } from "@/components/students/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SeasonStatusBadge } from "@/components/seasons/season-status-badge";
import type { SeasonStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Reports" };

export default async function SuperReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const data = await loadSuperReports();

  const seasonColumns: DataTableColumn<SeasonEnrollmentCount>[] = [
    {
      key: "season",
      header: "Season",
      cell: (r) => (
        <Link href={`/super/seasons/${r.seasonId}`} className="font-medium text-foreground hover:underline">
          {r.title}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <SeasonStatusBadge status={r.status as SeasonStatus} />,
    },
    { key: "active", header: "Active", cell: (r) => r.activeCount },
    { key: "completed", header: "Completed", cell: (r) => r.completedCount },
    {
      key: "dropped",
      header: "Dropped",
      cell: (r) =>
        r.droppedCount > 0 ? (
          <span className="font-medium text-error-600 dark:text-error-400">{r.droppedCount}</span>
        ) : (
          r.droppedCount
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Students and alumni across all seasons.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Current students" value={data.totalStudents} href="/super/students" />
        <StatCard label="Alumni" value={data.totalAlumni} href="/super/students/alumni" variant="teal" />
        <StatCard label="Active seasons" value={data.activeSeasonCount} href="/super/seasons" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students per season</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.seasons.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No seasons yet" description="Create a season to see enrollment breakdowns." />
          ) : (
            <DataTable columns={seasonColumns} rows={data.seasons} rowKey={(r) => r.seasonId} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alumni by graduation year</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.alumniByYear.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No alumni yet"
              description="Graduated students will be counted here by class year."
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.alumniByYear.map((a) => (
                <li key={a.year}>
                  <Badge variant="success" className="text-sm">
                    {a.year} · {a.count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
