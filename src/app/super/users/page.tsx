import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UsersList } from "@/components/users/users-list";

export const metadata = { title: "Users" };

export default async function SuperUsersPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const users = await db.user.findMany({
    orderBy: [{ deletedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastLoginAt: true,
      deletedAt: true,
    },
  });

  return (
    <AppShell user={user} title="Users">
      <PageHeader
        title="Users"
        description={`${users.filter((u) => !u.deletedAt).length} active · ${users.length} total`}
        actions={<Button render={<Link href="/super/users/new" />}>New user</Button>}
      />
      <UsersList rows={users} />
    </AppShell>
  );
}
