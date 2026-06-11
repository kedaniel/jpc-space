import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadSessionById } from "@/lib/sessions-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Edit session</h1>
        <p className="mt-1 text-sm text-neutral-500">{session.title}</p>
      </div>
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
              youtubeUrl: session.youtubeUrl,
              description: session.description,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
