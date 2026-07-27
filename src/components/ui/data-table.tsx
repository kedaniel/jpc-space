import * as React from "react";

import { cn } from "@/lib/utils";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  className?: string;
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  className?: string;
  emptyState?: React.ReactNode;
}

function DataTable<Row>({
  columns,
  rows,
  rowKey,
  className,
  emptyState,
}: DataTableProps<Row>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const [primary, ...rest] = columns;
  const metaColumns = rest.filter((col) => col.header !== "");
  const actionColumns = rest.filter((col) => col.header === "");

  return (
    <div className={cn("w-full", className)}>
      <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 text-left font-medium text-muted-foreground",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-foreground",
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] md:hidden">
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li
              key={rowKey(row)}
              className="flex min-h-11 items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                {primary.cell(row)}
                {metaColumns.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    {metaColumns.map((col, i) => (
                      <React.Fragment key={col.key}>
                        {i > 0 && <span aria-hidden="true">·</span>}
                        <span className="min-w-0">{col.cell(row)}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              {actionColumns.length > 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  {actionColumns.map((col) => (
                    <React.Fragment key={col.key}>{col.cell(row)}</React.Fragment>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { DataTable };
