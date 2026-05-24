import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentForm } from "@/components/assignments/assignment-form";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = { title: "New assignment" };

export default async function NewAssignmentPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

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
    <AppShell user={user} title={`${season.title} · New assignment`}>
      <PageHeader title="New assignment" description={`Add to ${season.title}.`} />
      <Card>
        <CardContent className="pt-6">
          <AssignmentForm
            mode="create"
            seasonId={season.id}
            seasonCode={season.code}
            sessions={sessions}
            groups={groups}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
