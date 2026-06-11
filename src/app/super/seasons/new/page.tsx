import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { SeasonForm } from "@/components/seasons/season-form";

export const metadata: Metadata = { title: "New Season" };

export default async function NewSeasonPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">New season</h1>
        <p className="mt-1 text-sm text-neutral-500">Set up a new program season.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SeasonForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
