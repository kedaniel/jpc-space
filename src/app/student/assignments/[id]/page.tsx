import { redirect } from "next/navigation";
import { format } from "date-fns";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import {
  ensureDraftSubmission,
} from "@/lib/assignment-actions";
import { loadAssignmentById } from "@/lib/assignments-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextView } from "@/components/ui/rich-text-view";
import { StudentSubmissionForm } from "@/components/assignments/student-submission-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Assignment" };

export default async function StudentAssignmentPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);
  const { id } = await params;
  const assignment = await loadAssignmentById(Number(id));

  // Verify the student is targeted by this assignment.
  if (user.activeSeasonId !== assignment.seasonId) redirect("/student/assignments");
  if (!assignment.isAllGroups) {
    const membership = await db.groupStudent.findUnique({
      where: { studentUserId: user.userId },
      select: { groupId: true },
    });
    if (!membership || !assignment.groupIds.includes(membership.groupId)) {
      redirect("/student/assignments");
    }
  }

  const stub = await ensureDraftSubmission(assignment.id, user.userId);
  const submission = await db.submission.findUnique({
    where: { id: stub.id },
    select: {
      id: true,
      status: true,
      text: true,
      feedback: true,
      files: {
        select: { id: true, originalName: true, sizeBytes: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });
  if (!submission) redirect("/student/assignments");

  return (
    <AppShell user={user} title={assignment.title}>
      <PageHeader
        title={assignment.title}
        description={
          assignment.dueAt
            ? `Due ${format(assignment.dueAt, "EEE, MMM d, yyyy · h:mm a")}`
            : "No due date"
        }
      />

      {assignment.description && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <RichTextView html={assignment.description} />
          </CardContent>
        </Card>
      )}

      <StudentSubmissionForm
        submissionId={submission.id}
        status={submission.status}
        initialText={submission.text ?? ""}
        initialFiles={submission.files}
        feedback={submission.feedback}
        dueAt={assignment.dueAt}
        acceptsFiles={assignment.maxFileSizeMb != null}
        maxFileSizeMb={assignment.maxFileSizeMb}
        allowedMimeCategories={assignment.allowedMimeCategories}
      />
    </AppShell>
  );
}
