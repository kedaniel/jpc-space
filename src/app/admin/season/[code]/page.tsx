import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonDetail } from "@/components/seasons/season-detail";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Season · ${code}` };
}

export default async function AdminSeasonDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);

  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  return (
    <>
      <PageHeader title={season.title} description={`Code: ${season.code}`} />
      <SeasonDetail
        season={season}
        canEdit={false}
        groupsHref={`/admin/season/${season.code}/groups`}
        calendarHref="/admin/calendar"
      />
    </>
  );
}
