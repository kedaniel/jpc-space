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
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      lateThresholdMinutes: true,
      absenceBudgetMinutes: true,
      absenceWeightMinutes: true,
      lateWeightMinutes: true,
    },
  });
  if (!season) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Edit · {season.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">Code: {season.code}</p>
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
              title: season.title,
              description: season.description ?? "",
              status: season.status,
              startDate: season.startDate,
              endDate: season.endDate,
              lateThresholdMinutes: season.lateThresholdMinutes,
              absenceBudgetMinutes: season.absenceBudgetMinutes,
              absenceWeightMinutes: season.absenceWeightMinutes,
              lateWeightMinutes: season.lateWeightMinutes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
