import Link from "next/link";
import { format } from "date-fns";
import { Inbox } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";
import type { LeaderQueueRow } from "@/lib/submissions-query";

interface LeaderQueueListProps {
  rows: LeaderQueueRow[];
}

export function LeaderQueueList({ rows }: LeaderQueueListProps) {
  const columns: DataTableColumn<LeaderQueueRow>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/leader/submissions/${row.publicId}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.studentName ?? row.studentEmail}
          </Link>
          <span className="text-xs text-muted-foreground">
            {row.groupName ? `${row.groupName} · ` : ""}
            {row.studentEmail}
          </span>
        </div>
      ),
    },
    {
      key: "assignment",
      header: "Assignment",
      cell: (row) => <span>{row.assignmentTitle}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <SubmissionStatusBadge status={row.status} />
          {row.submittedAt && row.assignmentDueAt && row.submittedAt > row.assignmentDueAt && (
            <Badge variant="warning">Late</Badge>
          )}
        </div>
      ),
    },
    {
      key: "when",
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
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.publicId}
      emptyState={
        <EmptyState
          icon={Inbox}
          title="No submissions yet"
          description="Submissions from students in your groups will appear here."
        />
      }
    />
  );
}
