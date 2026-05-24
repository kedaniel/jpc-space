import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Assignments" };

export default async function AdminAssignmentsRedirectPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);

  if (user.seasonAdminIds.length === 0) {
    return (
      <AppShell user={user} title="Assignments">
        <PageHeader
          title="Assignments"
          description="You aren't assigned to a season yet."
        />
      </AppShell>
    );
  }

  const season = await db.season.findFirst({
    where: { id: { in: user.seasonAdminIds }, deletedAt: null },
    orderBy: { startDate: "desc" },
    select: { code: true },
  });
  if (!season) {
    return (
      <AppShell user={user} title="Assignments">
        <PageHeader title="Assignments" description="No active season found." />
      </AppShell>
    );
  }
  redirect(`/admin/season/${season.code}/assignments`);
}
