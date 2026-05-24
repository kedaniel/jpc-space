import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadGroupById } from "@/lib/groups-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Group #${id}` };
}

export default async function GroupDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const group = await loadGroupById(Number(id));
  if (group.seasonId !== season.id) redirect(`/admin/season/${season.code}/groups`);

  return (
    <AppShell user={user} title={`${season.title} · ${group.name}`}>
      <PageHeader
        title={group.name}
        description={group.description ?? `Group in ${season.title}.`}
        actions={
          <Button
            variant="outline"
            render={
              <Link
                href={`/admin/season/${season.code}/groups/${group.id}/edit`}
              />
            }
          >
            Edit group
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leaders ({group.leaders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {group.leaders.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No leaders assigned.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {group.leaders.map((l) => (
                  <li key={l.id} className="flex flex-col py-2 first:pt-0 last:pb-0">
                    <span className="font-medium">{l.name ?? l.email}</span>
                    <span className="text-xs text-muted-foreground">{l.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Students ({group.students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.students.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No students enrolled.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {group.students.map((s) => (
                  <li key={s.id} className="flex flex-col py-2 first:pt-0 last:pb-0">
                    <span className="font-medium">{s.name ?? s.email}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
