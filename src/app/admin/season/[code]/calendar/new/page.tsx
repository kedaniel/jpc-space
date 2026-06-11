import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">New session</h1>
        <p className="mt-1 text-sm text-neutral-500">{`Add a session to ${season.title}.`}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SessionForm
            mode="create"
            seasonId={season.id}
            seasonCode={season.code}
          />
        </CardContent>
      </Card>
    </div>
  );
}
