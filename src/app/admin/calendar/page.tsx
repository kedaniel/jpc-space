import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Calendar" };

export default async function AdminCalendarRedirectPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);

  if (user.seasonAdminIds.length === 0) {
    return (
      <AppShell user={user} title="Calendar">
        <PageHeader title="Calendar" description="You aren't assigned to a season yet." />
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
      <AppShell user={user} title="Calendar">
        <PageHeader title="Calendar" description="No active season found." />
      </AppShell>
    );
  }
  redirect(`/admin/season/${season.code}/calendar`);
}
