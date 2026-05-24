import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import {
  loadGroupById,
  listLeadersForPicker,
  listStudentsForPicker,
} from "@/lib/groups-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GroupForm } from "@/components/groups/group-form";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export const metadata: Metadata = { title: "Edit group" };

export default async function EditGroupPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const [group, leaders, students] = await Promise.all([
    loadGroupById(Number(id)),
    listLeadersForPicker(),
    listStudentsForPicker(season.id),
  ]);
  if (group.seasonId !== season.id) redirect(`/admin/season/${season.code}/groups`);

  return (
    <AppShell user={user} title={`Edit ${group.name}`}>
      <PageHeader title={`Edit ${group.name}`} description="Update group details and membership." />
      <Card>
        <CardContent className="pt-6">
          <GroupForm
            mode="edit"
            seasonId={season.id}
            seasonCode={season.code}
            groupId={group.id}
            leaders={leaders}
            students={students}
            defaultValues={{
              name: group.name,
              description: group.description,
              leaderIds: group.leaders.map((l) => l.id),
              studentIds: group.students.map((s) => s.id),
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
