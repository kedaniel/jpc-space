import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SeasonForm } from "@/components/seasons/season-form";

export const metadata: Metadata = { title: "New Season" };

export default async function NewSeasonPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  return (
    <AppShell user={user} title="New season">
      <PageHeader
        title="New season"
        description="Set up a new program season."
      />
      <Card>
        <CardContent className="pt-6">
          <SeasonForm mode="create" />
        </CardContent>
      </Card>
    </AppShell>
  );
}
