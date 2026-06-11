import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">New student</h1>
        <p className="mt-1 text-sm text-neutral-500">Create the user, profile, and enrollment.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <StudentForm
            mode="create"
            seasons={seasons}
            redirectTo="/super/students"
          />
        </CardContent>
      </Card>
    </div>
  );
}
