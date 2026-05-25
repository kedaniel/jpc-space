import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listGroupsForSeason } from "@/lib/groups-query";
import { PageHeader } from "@/components/layout/page-header";
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
    <>
      <PageHeader
        title="Groups"
        description={`${groups.length} group${groups.length === 1 ? "" : "s"} in ${season.title}`}
        actions={<Button render={<Link href={createHref} />}>New group</Button>}
      />
      <GroupsList
        rows={groups}
        basePath={`/admin/season/${season.code}/groups`}
        createHref={createHref}
      />
    </>
  );
}
