import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  SeasonCreateButton,
  SeasonsList,
  type SeasonRow,
} from "@/components/seasons/seasons-list";

export const metadata: Metadata = { title: "Seasons" };

export default async function SuperSeasonsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const seasons = await db.season.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { groups: true } },
    },
  });

  const rows: SeasonRow[] = seasons.map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    groupCount: s._count.groups,
  }));

  return (
    <AppShell user={user} title="Seasons">
      <PageHeader
        title="Seasons"
        description="Create and manage program seasons."
        actions={<SeasonCreateButton />}
      />
      <SeasonsList
        rows={rows}
        basePath="/super/seasons"
        emptyAction={<SeasonCreateButton />}
      />
    </AppShell>
  );
}
