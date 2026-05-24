import Link from "next/link";
import { AlertCircle } from "lucide-react";

import {
  BarChartCard,
  LineChartCard,
  PieChartCard,
} from "@/components/ui/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ReportsData } from "@/lib/reports-query";

interface ReportsViewProps {
  data: ReportsData;
  exportCsvHref: string;
  studentDetailBase: string;
}

export function ReportsView({ data, exportCsvHref, studentDetailBase }: ReportsViewProps) {
  if (data.attendanceTrend.length === 0 && data.submissionRates.length === 0 && data.rawStudents.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No data in this scope"
        description="Adjust the filters or pick a season with activity."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href={exportCsvHref} />}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LineChartCard
          title="Attendance trend"
          description="Per-session attendance % over time"
          data={data.attendanceTrend.map((p) => ({ date: p.date, pct: p.pct }))}
          xKey="date"
          yKey="pct"
          yLabel="%"
        />
        <BarChartCard
          title="Submission completion"
          description="% of targeted students who submitted"
          data={data.submissionRates.map((r) => ({ title: r.title, pct: r.submittedPct }))}
          xKey="title"
          yKey="pct"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PieChartCard
          title="Engagement distribution"
          description="Students grouped by engagement bucket"
          data={data.engagementBuckets}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students at risk</CardTitle>
          </CardHeader>
          <CardContent>
            {data.atRisk.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nobody flagged in this scope.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.atRisk.map((r) => (
                  <li
                    key={`${r.studentUserId}-${r.seasonTitle ?? ""}`}
                    className="py-2 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`${studentDetailBase}/${r.studentUserId}`}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">{r.name ?? r.email}</span>
                        <span className="text-xs text-muted-foreground">{r.seasonTitle}</span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <Badge variant="warning" className="text-[10px]">
                          {r.attendancePct}% att
                        </Badge>
                        <Badge variant="error" className="text-[10px]">
                          {r.submissionPct}% sub
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
