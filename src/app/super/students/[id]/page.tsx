import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canViewStudent, canEditStudent, canWriteNote } from "@/lib/auth/permissions";
import { filterVisibleNotes, loadStudentDetail } from "@/lib/students-query";
import { computeEngagementForStudent } from "@/lib/engagement";
import { StudentDetail } from "@/components/students/student-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Student" };

export default async function SuperStudentDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { id } = await params;
  const studentUserId = Number(id);
  if (!(await canViewStudent(user, studentUserId))) redirect("/super/students");

  const student = await loadStudentDetail(studentUserId);
  const engagement = student.profile.activeSeasonId
    ? await computeEngagementForStudent(studentUserId, student.profile.activeSeasonId)
    : null;
  const visibleNotes = filterVisibleNotes(student.notes, user);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{student.name ?? student.email}</h1>
        <p className="mt-1 text-sm text-neutral-500">{student.email}</p>
      </div>
      <StudentDetail
        student={student}
        engagement={engagement}
        visibleNotes={visibleNotes}
        canEdit={await canEditStudent(user, studentUserId)}
        canWriteNote={await canWriteNote(user, studentUserId)}
        editHref={`/super/students/${student.id}/edit`}
      />
    </div>
  );
}
