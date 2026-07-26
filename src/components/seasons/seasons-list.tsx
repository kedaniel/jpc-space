import Link from "next/link";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil } from "lucide-react";

import { SeasonStatus } from "@/generated/prisma/enums";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeasonStatusBadge } from "@/components/seasons/season-status-badge";

export interface SeasonRow {
  id: number;
  code: string;
  title: string;
  program: string;
  year: number;
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
  /** When provided, an edit (pencil) action is shown per row linking here. */
  getEditHref?: (row: SeasonRow) => string;
}

export function SeasonsList({
  rows,
  basePath,
  emptyTitle = "No seasons yet",
  emptyDescription = "Create your first season to get started.",
  emptyAction,
  getEditHref,
}: SeasonsListProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const columns: DataTableColumn<SeasonRow>[] = [
    {
      key: "year",
      header: "Year",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.code}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.year}
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
    ...(getEditHref
      ? [
          {
            key: "actions",
            header: "",
            className: "w-px text-right",
            cell: (row: SeasonRow) => (
              <Button
                variant="ghost"
                size="icon-xs"
                render={
                  <Link href={getEditHref(row)} aria-label={`Edit ${row.title}`} />
                }
              >
                <Pencil className="size-4" />
              </Button>
            ),
          } satisfies DataTableColumn<SeasonRow>,
        ]
      : []),
  ];

  const programs = new Map<string, SeasonRow[]>();
  for (const row of rows) {
    const list = programs.get(row.program) ?? [];
    list.push(row);
    programs.set(row.program, list);
  }
  const groups = [...programs.entries()]
    .map(([program, seasons]) => ({
      program,
      seasons: [...seasons].sort((a, b) => b.year - a.year),
    }))
    .sort((a, b) => a.program.localeCompare(b.program));

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.program} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold text-foreground">{g.program}</h2>
            <Badge variant="outline">
              {g.seasons.length} year{g.seasons.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <DataTable columns={columns} rows={g.seasons} rowKey={(r) => r.id} />
        </div>
      ))}
    </div>
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
