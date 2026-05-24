import Link from "next/link";
import { Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "My groups" };

export default async function LeaderGroupsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  if (user.groupLeaderIds.length === 0) {
    return (
      <AppShell user={user} title="My groups">
        <PageHeader title="My groups" description="You don't lead any groups yet." />
        <EmptyState
          icon={Users}
          title="No groups"
          description="An admin will add you to a group when you're ready."
        />
      </AppShell>
    );
  }

  const groups = await db.group.findMany({
    where: { id: { in: user.groupLeaderIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      season: { select: { title: true, code: true } },
      students: {
        select: {
          studentUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { studentUser: { name: "asc" } },
      },
    },
  });

  return (
    <AppShell user={user} title="My groups">
      <PageHeader
        title="My groups"
        description={`${groups.length} group${groups.length === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{g.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{g.season.title}</p>
              </div>
              <Link
                href="/leader/calendar"
                className="text-sm font-medium text-brand-teal-700 hover:underline"
              >
                Calendar →
              </Link>
            </CardHeader>
            <CardContent>
              {g.students.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No students yet.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {g.students.map((s) => (
                    <li key={s.studentUser.id} className="text-sm">
                      <Link
                        href={`/leader/students/${s.studentUser.id}`}
                        className="hover:underline"
                      >
                        {s.studentUser.name ?? s.studentUser.email}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
