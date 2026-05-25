import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { FileText } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listAssignmentsForStudent } from "@/lib/assignments-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmissionStatusBadge } from "@/components/ui/submission-status-badge";

export const metadata = { title: "Assignments" };

export default async function StudentAssignmentsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const rows = await listAssignmentsForStudent(user.userId, user.activeSeasonId);

  return (
    <>
      <PageHeader
        title="Assignments"
        description={`${rows.length} assignment${rows.length === 1 ? "" : "s"} in your current season`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No assignments yet"
          description="Check back when your leader posts one."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const past = r.dueAt ? isPast(r.dueAt) : false;
            return (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-1">
                      <Link
                        href={`/student/assignments/${r.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {r.title}
                      </Link>
                      {r.dueAt && (
                        <p className="text-sm text-muted-foreground">
                          Due {format(r.dueAt, "MMM d, yyyy آ· h:mm a")}
                          {!past && ` (in ${formatDistanceToNowStrict(r.dueAt)})`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.status === "PENDING" ? (
                        <Badge variant={past ? "warning" : "outline"}>
                          {past ? "Past due" : "Not started"}
                        </Badge>
                      ) : (
                        <SubmissionStatusBadge status={r.status} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
