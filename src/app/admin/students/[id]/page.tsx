import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canViewStudent, canEditStudent, canWriteNote } from "@/lib/auth/permissions";
import { filterVisibleNotes, loadStudentDetail } from "@/lib/students-query";
import { computeEngagementForStudent } from "@/lib/engagement";
import { PageHeader } from "@/components/layout/page-header";
import { StudentDetail } from "@/components/students/student-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Student" };

export default async function AdminStudentDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);
  const { id } = await params;
  const studentUserId = Number(id);
  if (!(await canViewStudent(user, studentUserId))) redirect("/admin/students");

  const student = await loadStudentDetail(studentUserId);
  const engagement = student.profile.activeSeasonId
    ? await computeEngagementForStudent(studentUserId, student.profile.activeSeasonId)
    : null;
  const visibleNotes = filterVisibleNotes(student.notes, user);

  return (
    <>
      <PageHeader
        title={student.name ?? student.email}
        description={student.email}
      />
      <StudentDetail
        student={student}
        engagement={engagement}
        visibleNotes={visibleNotes}
        canEdit={await canEditStudent(user, studentUserId)}
        canWriteNote={await canWriteNote(user, studentUserId)}
        editHref={`/super/students/${student.id}/edit`}
      />
    </>
  );
}
