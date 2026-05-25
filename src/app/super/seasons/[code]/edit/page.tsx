import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
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
    },
  });
  if (!season) notFound();

  return (
    <>
      <PageHeader
        title={`Edit · ${season.title}`}
        description={`Code: ${season.code}`}
        actions={<DeleteSeasonButton seasonId={season.id} title={season.title} />}
      />
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
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
