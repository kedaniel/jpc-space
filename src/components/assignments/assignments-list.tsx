import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { FileText } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssignmentListRow } from "@/lib/assignments-query";

interface AssignmentsListProps {
  rows: AssignmentListRow[];
  basePath: string;
  createHref?: string;
}

function dueBadge(dueAt: Date | null) {
  if (!dueAt) return <Badge variant="outline">No due date</Badge>;
  if (isPast(dueAt)) return <Badge variant="warning">Due {format(dueAt, "MMM d, yyyy")}</Badge>;
  return (
    <Badge variant="info">
      Due in {formatDistanceToNowStrict(dueAt)}
    </Badge>
  );
}

export function AssignmentsList({ rows, basePath, createHref }: AssignmentsListProps) {
  const columns: DataTableColumn<AssignmentListRow>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: "due",
      header: "Due",
      cell: (row) => (
        <div className="flex flex-col items-end gap-1 md:items-start">
          {dueBadge(row.dueAt)}
          {row.dueAt && (
            <span className="text-xs text-muted-foreground">
              {format(row.dueAt, "MMM d, h:mm a")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "submissions",
      header: "Submissions",
      cell: (row) => (
        <span className="tabular-nums">
          {row.submissionCount}/{row.expectedCount}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      cell: (row) =>
        row.isAllGroups ? (
          <Badge variant="secondary">All students</Badge>
        ) : (
          <Badge variant="outline">Some groups</Badge>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      emptyState={
        <EmptyState
          icon={FileText}
          title="No assignments yet"
          description="Create an assignment so students have something to submit."
          action={
            createHref ? (
              <Button render={<Link href={createHref} />}>New assignment</Button>
            ) : undefined
          }
        />
      }
    />
  );
}
