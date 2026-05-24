import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SessionForm } from "@/components/sessions/session-form";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = { title: "New session" };

export default async function NewSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  return (
    <AppShell user={user} title={`${season.title} · New session`}>
      <PageHeader
        title="New session"
        description={`Add a session to ${season.title}.`}
      />
      <Card>
        <CardContent className="pt-6">
          <SessionForm
            mode="create"
            seasonId={season.id}
            seasonCode={season.code}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
