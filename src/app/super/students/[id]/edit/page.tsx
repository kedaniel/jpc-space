import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditStudent } from "@/lib/auth/permissions";
import { loadStudentDetail } from "@/lib/students-query";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Edit {student.name ?? student.email}</h1>
        <p className="mt-1 text-sm text-neutral-500">Update profile, contact, and enrollment.</p>
      </div>
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
    </div>
  );
}
