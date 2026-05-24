import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentForm } from "@/components/students/student-form";

export const metadata: Metadata = { title: "New student" };

export default async function NewStudentPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER", "ADMIN"]);

  const seasons = await db.season.findMany({
    where: { deletedAt: null, status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { startDate: "desc" },
    select: { id: true, title: true },
  });

  return (
    <AppShell user={user} title="New student">
      <PageHeader
        title="New student"
        description="Create the user, profile, and enrollment."
      />
      <Card>
        <CardContent className="pt-6">
          <StudentForm
            mode="create"
            seasons={seasons}
            redirectTo="/super/students"
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
