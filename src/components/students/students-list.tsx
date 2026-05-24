import Link from "next/link";
import { Users } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { StudentListRow } from "@/lib/students-query";

interface StudentsListProps {
  rows: StudentListRow[];
  basePath: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

function initialsFor(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function StudentsList({
  rows,
  basePath,
  emptyTitle = "No students yet",
  emptyDescription = "Students will appear here once they're enrolled.",
  emptyAction,
}: StudentsListProps) {
  const columns: DataTableColumn<StudentListRow>[] = [
    {
      key: "name",
      header: "Student",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.id}`}
          className="inline-flex items-center gap-2 hover:underline"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initialsFor(row.name, row.email)}</AvatarFallback>
          </Avatar>
          <span className="flex flex-col">
            <span className="font-medium">{row.name ?? row.email}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "university",
      header: "University",
      cell: (row) =>
        row.university ? (
          <span className="text-sm">
            {row.university}
            {row.year && <span className="text-muted-foreground"> · {row.year}</span>}
          </span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
    {
      key: "season",
      header: "Season",
      cell: (row) =>
        row.activeSeasonTitle ? (
          <Badge variant="outline">{row.activeSeasonTitle}</Badge>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
    {
      key: "group",
      header: "Group",
      cell: (row) =>
        row.groupName ? (
          <Badge variant="secondary">{row.groupName}</Badge>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
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
          icon={Users}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      }
    />
  );
}
