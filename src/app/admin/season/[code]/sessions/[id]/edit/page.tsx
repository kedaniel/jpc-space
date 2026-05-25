import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SessionForm } from "@/components/sessions/session-form";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const session = await loadSessionById(Number(id));
  if (session.seasonId !== season.id) redirect(`/admin/season/${season.code}/calendar`);

  return (
    <>
      <PageHeader title={`Edit session`} description={session.title} />
      <Card>
        <CardContent className="pt-6">
          <SessionForm
            mode="edit"
            seasonId={season.id}
            seasonCode={season.code}
            sessionId={session.id}
            hasRecurrence={Boolean(session.recurrenceGroupId)}
            defaultValues={{
              title: session.title,
              startsAt: session.startsAt,
              durationMinutes: session.durationMinutes,
              location: session.location,
              description: session.description,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
