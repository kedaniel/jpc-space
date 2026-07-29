import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSuperReports, type SeasonEnrollmentCount } from "@/lib/super-reports-query";
import { StatCard } from "@/components/students/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChartCard } from "@/components/ui/charts";
import { SeasonStatusBadge } from "@/components/seasons/season-status-badge";
import type { SeasonStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Reports" };

export default async function SuperReportsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const data = await loadSuperReports();

  // Pie: one slice per season sized by its current active enrollment.
  const studentsPerSeasonPie = data.seasons
    .filter((s) => s.activeCount > 0)
    .map((s) => ({ name: s.title, value: s.activeCount }));
  const alumniByYearPie = data.alumniByYear.map((a) => ({
    name: String(a.year),
    value: a.count,
  }));

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {studentsPerSeasonPie.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active members per season</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <EmptyState
                icon={GraduationCap}
                title="No active members"
                description="Enroll students in a season to see the breakdown."
              />
            </CardContent>
          </Card>
        ) : (
          <PieChartCard
            title="Active members per season"
            description="Current active enrollment across seasons"
            data={studentsPerSeasonPie}
          />
        )}

        {alumniByYearPie.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alumni by graduation year</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <EmptyState
                icon={GraduationCap}
                title="No alumni yet"
                description="Graduated students will be counted here by class year."
              />
            </CardContent>
          </Card>
        ) : (
          <PieChartCard
            title="Alumni by graduation year"
            description="Graduates grouped by class year"
            data={alumniByYearPie}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students per season</CardTitle>
          <p className="text-sm text-muted-foreground">Active, completed, and dropped counts</p>
        </CardHeader>
        <CardContent className="pt-0">
          {data.seasons.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No seasons yet" description="Create a season to see enrollment breakdowns." />
          ) : (
            <DataTable columns={seasonColumns} rows={data.seasons} rowKey={(r) => r.seasonId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
