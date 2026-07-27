import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonsList, type SeasonRow } from "@/components/seasons/seasons-list";

interface PageProps {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} · Seasons` };
}

export default async function SeasonYearPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { year } = await params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) notFound();

  const seasons = await db.season.findMany({
    where: { year: yearNum, deletedAt: null },
    orderBy: { program: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      program: true,
      year: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { groups: true } },
    },
  });
  if (seasons.length === 0) notFound();

  const rows: SeasonRow[] = seasons.map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    program: s.program,
    year: s.year,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    groupCount: s._count.groups,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={String(yearNum)}
        description={`${rows.length} season${rows.length === 1 ? "" : "s"} across all programs in ${yearNum}`}
      />
      <SeasonsList rows={rows} basePath="/super/seasons" getEditHref={(r) => `/super/seasons/${r.code}/edit`} />
    </div>
  );
}
