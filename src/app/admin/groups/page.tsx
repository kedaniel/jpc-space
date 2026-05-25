import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Groups" };

export default async function AdminGroupsRedirectPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);

  if (user.seasonAdminIds.length === 0) {
    return (
      <>
        <PageHeader
          title="Groups"
          description="You aren't assigned to a season yet."
        />
      </>
    );
  }

  const season = await db.season.findFirst({
    where: { id: { in: user.seasonAdminIds }, deletedAt: null },
    orderBy: { startDate: "desc" },
    select: { code: true },
  });
  if (!season) {
    return (
      <>
        <PageHeader
          title="Groups"
          description="No active season found."
        />
      </>
    );
  }
  redirect(`/admin/season/${season.code}/groups`);
}
