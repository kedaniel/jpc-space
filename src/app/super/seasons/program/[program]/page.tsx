import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonsList, type SeasonRow } from "@/components/seasons/seasons-list";

interface PageProps {
  params: Promise<{ program: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { program } = await params;
  return { title: `${decodeURIComponent(program)} · Seasons` };
}

export default async function SeasonProgramHistoryPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { program } = await params;
  const programName = decodeURIComponent(program);

  const seasons = await db.season.findMany({
    where: { program: programName, deletedAt: null },
    orderBy: { year: "desc" },
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
        title={programName}
        description={`${rows.length} year${rows.length === 1 ? "" : "s"} of ${programName}`}
      />
      <SeasonsList rows={rows} basePath="/super/seasons" getEditHref={(r) => `/super/seasons/${r.code}/edit`} />
    </div>
  );
}
