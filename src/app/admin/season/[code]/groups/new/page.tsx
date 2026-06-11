import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import {
  listLeadersForPicker,
  listStudentsForPicker,
} from "@/lib/groups-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">New group</h1>
        <p className="mt-1 text-sm text-neutral-500">{`Add a group to ${season.title}.`}</p>
      </div>
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
    </div>
  );
}
