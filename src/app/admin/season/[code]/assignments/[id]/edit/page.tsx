import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadAssignmentById } from "@/lib/assignments-query";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentForm } from "@/components/assignments/assignment-form";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export const metadata: Metadata = { title: "Edit assignment" };

export default async function EditAssignmentPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const assignment = await loadAssignmentById(Number(id));
  if (assignment.seasonId !== season.id) redirect(`/admin/season/${season.code}/assignments`);

  const [sessions, groups] = await Promise.all([
    db.session.findMany({
      where: { seasonId: season.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true },
    }),
    db.group.findMany({
      where: { seasonId: season.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Edit assignment</h1>
        <p className="mt-1 text-sm text-neutral-500">{assignment.title}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <AssignmentForm
            mode="edit"
            seasonId={season.id}
            seasonCode={season.code}
            assignmentId={assignment.id}
            sessions={sessions}
            groups={groups}
            defaultValues={{
              title: assignment.title,
              description: assignment.description,
              dueAt: assignment.dueAt,
              sessionId: assignment.sessionId,
              maxFileSizeMb: assignment.maxFileSizeMb,
              allowedMimeCategories: assignment.allowedMimeCategories,
              isAllGroups: assignment.isAllGroups,
              groupIds: assignment.groupIds,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
