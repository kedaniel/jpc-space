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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{`Edit ${group.name}`}</h1>
        <p className="mt-1 text-sm text-neutral-500">Update group details and membership.</p>
      </div>
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
    </div>
  );
}
