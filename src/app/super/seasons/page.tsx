import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Seasons</h1>
          <p className="mt-1 text-sm text-neutral-500">Create and manage program seasons.</p>
        </div>
        <SeasonCreateButton />
      </div>
      <SeasonsList
        rows={rows}
        basePath="/super/seasons"
        emptyAction={<SeasonCreateButton />}
      />
    </div>
  );
}
