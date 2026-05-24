import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadReportsData } from "@/lib/reports-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsView } from "@/components/reports/reports-view";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Reports · ${code}` };
}

export default async function AdminSeasonReportsPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/dashboard");

  const data = await loadReportsData({ seasonIds: [season.id] });

  return (
    <AppShell user={user} title={`${season.title} · Reports`}>
      <PageHeader title="Reports" description={`Scoped to ${season.title}.`} />
      <ReportsView
        data={data}
        exportCsvHref={`/api/reports/export?season=${season.id}`}
        studentDetailBase="/admin/students"
      />
    </AppShell>
  );
}
