import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { SeasonForm } from "@/components/seasons/season-form";
import { DeleteSeasonButton } from "@/components/seasons/delete-season-button";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = { title: "Edit season" };

export default async function EditSeasonPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { code } = await params;

  const season = await db.season.findFirst({
    where: { code, deletedAt: null },
    select: {
      id: true,
      code: true,
      title: true,
      program: true,
      year: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      absenceBudgetMinutes: true,
      absenceWeightMinutes: true,
    },
  });
  if (!season) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Edit · {season.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Code: {season.code}</p>
        </div>
        <DeleteSeasonButton seasonId={season.id} title={season.title} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <SeasonForm
            mode="edit"
            seasonId={season.id}
            defaultValues={{
              code: season.code,
              program: season.program,
              year: season.year,
              description: season.description ?? "",
              status: season.status,
              startDate: season.startDate,
              endDate: season.endDate,
              absenceBudgetMinutes: season.absenceBudgetMinutes,
              absenceWeightMinutes: season.absenceWeightMinutes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
