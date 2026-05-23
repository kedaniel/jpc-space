import Link from "next/link";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { SeasonStatus } from "@/generated/prisma/enums";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SeasonStatusBadge } from "@/components/seasons/season-status-badge";

export interface SeasonRow {
  id: number;
  code: string;
  title: string;
  status: SeasonStatus;
  startDate: Date;
  endDate: Date;
  groupCount: number;
}

interface SeasonsListProps {
  rows: SeasonRow[];
  basePath: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function SeasonsList({
  rows,
  basePath,
  emptyTitle = "No seasons yet",
  emptyDescription = "Create your first season to get started.",
  emptyAction,
}: SeasonsListProps) {
  const columns: DataTableColumn<SeasonRow>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.code}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <SeasonStatusBadge status={row.status} />,
    },
    {
      key: "dates",
      header: "Dates",
      cell: (row) => (
        <span className="text-muted-foreground">
          {format(row.startDate, "MMM d, yyyy")} – {format(row.endDate, "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "groups",
      header: "Groups",
      cell: (row) => row.groupCount,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      emptyState={
        <EmptyState
          icon={CalendarIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      }
    />
  );
}

export function SeasonsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}

export function SeasonCreateButton() {
  return (
    <Button render={<Link href="/super/seasons/new" />}>New season</Button>
  );
}
