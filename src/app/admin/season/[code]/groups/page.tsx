import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listGroupsForSeason } from "@/lib/groups-query";
import { Button } from "@/components/ui/button";
import { GroupsList } from "@/components/groups/groups-list";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Groups · ${code}` };
}

export default async function AdminGroupsPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const groups = await listGroupsForSeason(season.id);
  const createHref = `/admin/season/${season.code}/groups/new`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Groups</h1>
          <p className="mt-1 text-sm text-neutral-500">{`${groups.length} group${groups.length === 1 ? "" : "s"} in ${season.title}`}</p>
        </div>
        <Button render={<Link href={createHref} />}>New group</Button>
      </div>
      <GroupsList
        rows={groups}
        basePath={`/admin/season/${season.code}/groups`}
        createHref={createHref}
      />
    </div>
  );
}
