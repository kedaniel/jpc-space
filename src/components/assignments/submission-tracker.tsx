import Link from "next/link";
import { format } from "date-fns";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";
import type { SubmissionTrackerRow } from "@/lib/assignments-query";

interface SubmissionTrackerProps {
  rows: SubmissionTrackerRow[];
  reviewBasePath: string; // e.g. "/leader/submissions"
}

export function SubmissionTracker({ rows, reviewBasePath }: SubmissionTrackerProps) {
  const columns: DataTableColumn<SubmissionTrackerRow>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name ?? row.email}</span>
          <span className="text-xs text-muted-foreground">
            {row.groupName ? `${row.groupName} · ` : ""}
            {row.email}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === "PENDING" ? (
            <Badge variant="outline">Pending</Badge>
          ) : (
            <SubmissionStatusBadge status={row.status} />
          )}
          {row.isLate && <Badge variant="warning">Late</Badge>}
        </div>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) =>
        row.submittedAt ? (
          <span className="text-sm text-muted-foreground">
            {format(row.submittedAt, "MMM d, h:mm a")}
          </span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.submissionPublicId ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`${reviewBasePath}/${row.submissionPublicId}`} />}
          >
            Open
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.studentUserId}
      emptyState={
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No students targeted by this assignment.
        </p>
      }
    />
  );
}
