import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { loadAssignmentById, loadSubmissionTracker } from "@/lib/assignments-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextView } from "@/components/ui/rich-text-view";
import { SubmissionTracker } from "@/components/assignments/submission-tracker";

interface PageProps {
  params: Promise<{ code: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Assignment #${id}` };
}

export default async function AdminAssignmentDetailPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code, id } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const assignment = await loadAssignmentById(Number(id));
  if (assignment.seasonId !== season.id) redirect(`/admin/season/${season.code}/assignments`);

  const tracker = await loadSubmissionTracker(assignment.id);
  const submitted = tracker.filter((r) => r.status !== "PENDING").length;

  return (
    <AppShell user={user} title={`${season.title} · ${assignment.title}`}>
      <PageHeader
        title={assignment.title}
        description={
          assignment.dueAt
            ? `Due ${format(assignment.dueAt, "EEE, MMM d, yyyy · h:mm a")}`
            : "No due date"
        }
        actions={
          <Button
            variant="outline"
            render={
              <Link
                href={`/admin/season/${season.code}/assignments/${assignment.id}/edit`}
              />
            }
          >
            Edit assignment
          </Button>
        }
      />

      {assignment.description && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <RichTextView html={assignment.description} />
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">
          {submitted}/{tracker.length} submitted
        </Badge>
        {assignment.isAllGroups ? (
          <Badge variant="outline">All students</Badge>
        ) : (
          <Badge variant="outline">{assignment.groupIds.length} group(s)</Badge>
        )}
        {assignment.maxFileSizeMb && (
          <Badge variant="outline">
            Files up to {assignment.maxFileSizeMb} MB
          </Badge>
        )}
        {assignment.sessionTitle && (
          <Badge variant="outline">Session: {assignment.sessionTitle}</Badge>
        )}
      </div>

      <SubmissionTracker
        rows={tracker}
        reviewBasePath="/leader/submissions"
      />
    </AppShell>
  );
}
