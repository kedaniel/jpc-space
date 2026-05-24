import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditStudent } from "@/lib/auth/permissions";
import { loadStudentDetail } from "@/lib/students-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentForm } from "@/components/students/student-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit student" };

export default async function SuperStudentEditPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { id } = await params;
  const studentUserId = Number(id);
  if (!(await canEditStudent(user, studentUserId))) redirect("/super/students");

  const student = await loadStudentDetail(studentUserId);
  const seasons = await db.season.findMany({
    where: { deletedAt: null },
    orderBy: { startDate: "desc" },
    select: { id: true, title: true },
  });

  return (
    <AppShell user={user} title={`Edit ${student.name ?? student.email}`}>
      <PageHeader
        title={`Edit ${student.name ?? student.email}`}
        description="Update profile, contact, and enrollment."
      />
      <Card>
        <CardContent className="pt-6">
          <StudentForm
            mode="edit"
            studentUserId={student.id}
            seasons={seasons}
            redirectTo={`/super/students/${student.id}`}
            defaultValues={{
              name: student.name ?? "",
              email: student.email,
              university: student.profile.university,
              year: student.profile.year,
              phone: student.profile.phone,
              dateOfBirth: student.profile.dateOfBirth,
              spiritualBackground: student.profile.spiritualBackground,
              gifts: student.profile.gifts,
              notes: student.profile.notes,
              activeSeasonId: student.profile.activeSeasonId,
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
