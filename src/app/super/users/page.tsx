import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Users</h1>
          <p className="mt-1 text-sm text-neutral-500">{users.filter((u) => !u.deletedAt).length} active · {users.length} total</p>
        </div>
        <Button render={<Link href="/super/users/new" />}>New user</Button>
      </div>
      <UsersList rows={users} />
    </div>
  );
}
