import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import {
  listLeadersForPicker,
  listStudentsForPicker,
} from "@/lib/groups-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GroupForm } from "@/components/groups/group-form";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const [leaders, students] = await Promise.all([
    listLeadersForPicker(),
    listStudentsForPicker(season.id),
  ]);

  return (
    <AppShell user={user} title={`${season.title} · New group`}>
      <PageHeader
        title="New group"
        description={`Add a group to ${season.title}.`}
      />
      <Card>
        <CardContent className="pt-6">
          <GroupForm
            mode="create"
            seasonId={season.id}
            seasonCode={season.code}
            leaders={leaders}
            students={students}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
