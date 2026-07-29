import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { AlumnusRow } from "@/lib/students-query";

interface AlumniListProps {
  rows: AlumnusRow[];
  basePath: string;
}

export function AlumniList({ rows, basePath }: AlumniListProps) {
  const columns: DataTableColumn<AlumnusRow>[] = [
    {
      key: "student",
      header: "Alumnus",
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
      key: "graduationYear",
      header: "Class of",
      cell: (row) => <Badge variant="success">{row.graduationYear}</Badge>,
    },
    {
      key: "university",
      header: "University",
      cell: (row) =>
        row.university ? (
          <span className="text-sm">{row.university}</span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.studentUserId}
      emptyState={
        <EmptyState
          icon={GraduationCap}
          title="No alumni yet"
          description="Students you graduate will appear here."
        />
      }
    />
  );
}
