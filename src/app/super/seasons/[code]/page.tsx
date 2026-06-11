import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { SeasonDetail } from "@/components/seasons/season-detail";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Season · ${code}` };
}

export default async function SuperSeasonDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{season.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Code: {season.code}</p>
      </div>
      <SeasonDetail
        season={season}
        canEdit
        editHref={`/super/seasons/${season.code}/edit`}
        groupsHref={`/super/seasons/${season.code}/groups`}
        calendarHref="/super/calendar"
      />
    </div>
  );
}
