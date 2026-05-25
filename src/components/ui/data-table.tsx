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

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]"
          >
            <dl className="flex flex-col gap-1.5">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-xs font-medium text-muted-foreground">
                    {col.header}
                  </dt>
                  <dd className="text-right text-sm text-foreground">
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { DataTable };
