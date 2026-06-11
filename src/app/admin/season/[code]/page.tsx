import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listSessionsForSeason } from "@/lib/sessions-query";
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

  const sessions = await listSessionsForSeason(season.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{season.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{`Code: ${season.code}`}</p>
      </div>
      <SeasonDetail
        season={season}
        sessions={sessions}
        checkInBaseUrl={process.env.AUTH_URL!}
        canEdit={false}
        groupsHref={`/admin/season/${season.code}/groups`}
        calendarHref="/admin/calendar"
        sessionBasePath={`/admin/season/${season.code}/sessions`}
      />
    </div>
  );
}
