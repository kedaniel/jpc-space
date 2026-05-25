import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Session #${id}` };
}

export default async function SessionDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const session = await loadSessionById(Number(id));
  if (session.seasonId !== season.id) redirect(`/admin/season/${season.code}/calendar`);

  return (
    <>
      <PageHeader
        title={session.title}
        description={`${format(session.startsAt, "EEE, MMM d, yyyy · h:mm a")} · ${session.durationMinutes} min`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              render={
                <Link
                  href={`/admin/season/${season.code}/sessions/${session.id}/edit`}
                />
              }
            >
              Edit
            </Button>
            <Button
              render={
                <Link
                  href={`/admin/season/${season.code}/sessions/${session.id}/attendance`}
                />
              }
            >
              Mark attendance
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {session.recurrenceGroupId && (
            <Badge variant="outline" className="self-start">
              Part of a recurring series
            </Badge>
          )}
          {session.location && (
            <p className="inline-flex items-center gap-1.5 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              {session.location}
            </p>
          )}
          {session.description && (
            <p className="whitespace-pre-line text-sm text-foreground">
              {session.description}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
