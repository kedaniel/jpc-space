import { redirect } from "next/navigation";
import { format } from "date-fns";
import { File as FileIcon } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import {
  requireRole,
  canViewSubmission,
  canReviewSubmission,
} from "@/lib/auth/permissions";
import { loadSubmissionByPublicId } from "@/lib/submissions-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextView } from "@/components/ui/rich-text-view";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";
import { SubmissionReviewForm } from "@/components/assignments/submission-review-form";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export const metadata = { title: "Review submission" };

export default async function LeaderSubmissionDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER", "ADMIN", "SUPER", "MENTOR"]);

  const { publicId } = await params;
  const submission = await loadSubmissionByPublicId(publicId);
  if (!(await canViewSubmission(user, submission.id))) redirect("/leader/submissions");

  const canReview = await canReviewSubmission(user, submission.id);
  const isLate =
    submission.submittedAt && submission.assignmentDueAt
      ? submission.submittedAt.getTime() > submission.assignmentDueAt.getTime()
      : false;

  return (
    <AppShell user={user} title={`${submission.studentName ?? submission.studentEmail}`}>
      <PageHeader
        title={submission.assignmentTitle}
        description={`${submission.studentName ?? submission.studentEmail}${submission.groupName ? ` · ${submission.groupName}` : ""}`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SubmissionStatusBadge status={submission.status} />
        {isLate && <Badge variant="warning">Late</Badge>}
        {submission.submittedAt && (
          <Badge variant="outline">
            Submitted {format(submission.submittedAt, "MMM d, h:mm a")}
          </Badge>
        )}
        {submission.assignmentDueAt && (
          <Badge variant="outline">
            Due {format(submission.assignmentDueAt, "MMM d, h:mm a")}
          </Badge>
        )}
      </div>

      {submission.assignmentDescription && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Assignment prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextView html={submission.assignmentDescription} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Submission</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RichTextView html={submission.text} emptyText="No written response." />

          {submission.files.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Attachments</p>
              {submission.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.originalName}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {(f.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
              <p className="text-xs italic text-muted-foreground">
                File download isn&apos;t wired up in the demo build — see TODO.md.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {canReview ? (
        <SubmissionReviewForm
          submissionId={submission.id}
          initialFeedback={submission.feedback ?? ""}
          alreadyReviewed={Boolean(submission.reviewedAt)}
        />
      ) : submission.feedback ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextView html={submission.feedback} />
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
