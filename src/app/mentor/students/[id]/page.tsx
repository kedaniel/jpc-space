import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canViewStudent, canWriteNote } from "@/lib/auth/permissions";
import { filterVisibleNotes, loadStudentDetail } from "@/lib/students-query";
import { computeEngagementForStudent } from "@/lib/engagement";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StudentDetail } from "@/components/students/student-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Student" };

export default async function MentorStudentDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);
  const { id } = await params;
  const studentUserId = Number(id);
  if (!(await canViewStudent(user, studentUserId))) redirect("/mentor/students");

  const student = await loadStudentDetail(studentUserId);
  const engagement = student.profile.activeSeasonId
    ? await computeEngagementForStudent(studentUserId, student.profile.activeSeasonId)
    : null;
  const visibleNotes = filterVisibleNotes(student.notes, user);

  return (
    <AppShell user={user} title={student.name ?? student.email}>
      <PageHeader
        title={student.name ?? student.email}
        description={`${student.email} · mentor view`}
      />
      <StudentDetail
        student={student}
        engagement={engagement}
        visibleNotes={visibleNotes}
        canEdit={false}
        canWriteNote={await canWriteNote(user, studentUserId)}
        showDocumentsTab={false}
      />
    </AppShell>
  );
}
