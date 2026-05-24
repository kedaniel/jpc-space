import Link from "next/link";
import { format } from "date-fns";
import { Users } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/generated/prisma/enums";

export interface UserRow {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
}

const roleColor: Record<UserRole, "super" | "admin" | "leader" | "mentor" | "student"> = {
  SUPER: "super",
  ADMIN: "admin",
  LEADER: "leader",
  MENTOR: "mentor",
  STUDENT: "student",
};

function initialsFor(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

interface UsersListProps {
  rows: UserRow[];
}

export function UsersList({ rows }: UsersListProps) {
  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <Link
          href={`/super/users/${row.id}/edit`}
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
      key: "role",
      header: "Role",
      cell: (row) => (
        <Badge role={roleColor[row.role]} className="uppercase">
          {row.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.deletedAt ? (
          <Badge variant="warning">Inactive</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      cell: (row) =>
        row.lastLoginAt ? (
          <span className="text-sm text-muted-foreground">
            {format(row.lastLoginAt, "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-sm italic text-muted-foreground">never</span>
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
          title="No users yet"
          description="Add the first user to get started."
        />
      }
    />
  );
}
