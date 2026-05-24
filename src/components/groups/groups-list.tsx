import Link from "next/link";
import { Users } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { GroupListRow } from "@/lib/groups-query";

interface GroupsListProps {
  rows: GroupListRow[];
  basePath: string;
  createHref?: string;
}

export function GroupsList({ rows, basePath, createHref }: GroupsListProps) {
  const columns: DataTableColumn<GroupListRow>[] = [
    {
      key: "name",
      header: "Group",
      cell: (row) => (
        <Link
          href={`${basePath}/${row.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "leaders",
      header: "Leaders",
      cell: (row) =>
        row.leaderNames.length === 0 ? (
          <span className="italic text-muted-foreground">No leaders</span>
        ) : (
          <span className="text-muted-foreground">{row.leaderNames.join(", ")}</span>
        ),
    },
    {
      key: "students",
      header: "Students",
      cell: (row) => row.studentCount,
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
          title="No groups yet"
          description="Create a group to organize students and assign leaders."
          action={
            createHref ? (
              <Button render={<Link href={createHref} />}>New group</Button>
            ) : undefined
          }
        />
      }
    />
  );
}
