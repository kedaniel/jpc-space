import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { SeasonsList, type SeasonRow } from "@/components/seasons/seasons-list";

export const metadata: Metadata = { title: "My Season" };

export default async function AdminSeasonsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);

  if (user.seasonAdminIds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">My Season</h1>
          <p className="mt-1 text-sm text-neutral-500">You aren&apos;t assigned to a season yet. Contact a super-admin to be added.</p>
        </div>
      </div>
    );
  }

  const seasons = await db.season.findMany({
    where: { id: { in: user.seasonAdminIds }, deletedAt: null },
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

  if (seasons.length === 1) redirect(`/admin/season/${seasons[0].code}`);

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
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">My Season</h1>
        <p className="mt-1 text-sm text-neutral-500">Seasons you administer.</p>
      </div>
      <SeasonsList rows={rows} basePath="/admin/season" />
    </div>
  );
}
