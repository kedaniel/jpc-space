import Link from "next/link";
import { format } from "date-fns";
import { UserMinus } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { DroppedStudentRow } from "@/lib/students-query";

interface DroppedStudentsListProps {
  rows: DroppedStudentRow[];
  basePath: string;
}

export function DroppedStudentsList({ rows, basePath }: DroppedStudentsListProps) {
  const columns: DataTableColumn<DroppedStudentRow>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.studentUserId}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.name ?? row.email}
        </Link>
      ),
    },
    {
      key: "season",
      header: "Dropped from",
      cell: (row) => (
        <Badge variant="outline">
          {row.seasonProgram} {row.seasonYear}
        </Badge>
      ),
    },
    {
      key: "droppedAt",
      header: "Dropped on",
      cell: (row) => (
        <span className="text-muted-foreground">{format(row.droppedAt, "MMM d, yyyy")}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) =>
        row.dropReason ? (
          <span className="text-sm">{row.dropReason}</span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.enrollmentId}
      emptyState={
        <EmptyState
          icon={UserMinus}
          title="No dropped students"
          description="Students who leave a season without graduating will show up here."
        />
      }
    />
  );
}
