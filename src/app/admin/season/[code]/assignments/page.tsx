import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listAssignmentsForSeason } from "@/lib/assignments-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AssignmentsList } from "@/components/assignments/assignments-list";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Assignments · ${code}` };
}

export default async function AdminAssignmentsPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const rows = await listAssignmentsForSeason(season.id);
  const createHref = `/admin/season/${season.code}/assignments/new`;

  return (
    <>
      <PageHeader
        title="Assignments"
        description={`${rows.length} assignment${rows.length === 1 ? "" : "s"}`}
        actions={<Button render={<Link href={createHref} />}>New assignment</Button>}
      />
      <AssignmentsList
        rows={rows}
        basePath={`/admin/season/${season.code}/assignments`}
        createHref={createHref}
      />
    </>
  );
}
