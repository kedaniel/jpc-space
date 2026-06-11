import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { FileText } from "lucide-react";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listAssignmentsForStudent } from "@/lib/assignments-query";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/students/stat-card";
import type { SubmissionStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Assignments" };

type RowStatus = SubmissionStatus | "PENDING";

function statusDot(status: RowStatus, dueAt: Date | null): string {
  if (status === "REVIEWED") return "bg-success-500";
  if (status === "SUBMITTED") return "bg-brand-teal-500";
  if (status === "DRAFT") return "bg-warning-500";
  if (dueAt && isPast(dueAt)) return "bg-error-500";
  return "bg-neutral-300";
}

function StatusBadge({
  status,
  dueAt,
}: {
  status: RowStatus;
  dueAt: Date | null;
}) {
  if (status === "REVIEWED")
    return <Badge variant="success">Reviewed</Badge>;
  if (status === "SUBMITTED")
    return <Badge variant="teal">Submitted</Badge>;
  if (status === "DRAFT")
    return <Badge variant="warning">Draft</Badge>;
  if (dueAt && isPast(dueAt))
    return <Badge variant="error">Past due</Badge>;
  return <Badge variant="outline">Not started</Badge>;
}

export default async function StudentAssignmentsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const rows = await listAssignmentsForStudent(user.userId, user.activeSeasonId);

  const submitted = rows.filter(
    (r) => r.status === "SUBMITTED" || r.status === "REVIEWED",
  ).length;
  const pending = rows.filter(
    (r) => r.status === "PENDING" || r.status === "DRAFT",
  ).length;
  const reviewed = rows.filter((r) => r.status === "REVIEWED").length;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Assignments</h1>
        <p className="mt-1 text-sm text-neutral-500">Your current season</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No assignments yet"
          description="Check back when your leader posts one."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Submitted" value={submitted} />
            <StatCard
              label="Pending"
              value={pending}
              variant={pending > 0 ? "teal" : "white"}
            />
            <StatCard label="Reviewed" value={reviewed} />
          </div>

          <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
            <ul className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${statusDot(r.status as RowStatus, r.dueAt)}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/student/assignments/${r.id}`}
                      className="truncate text-sm font-semibold text-brand-navy-900 hover:underline"
                    >
                      {r.title}
                    </Link>
                    {r.dueAt && (
                      <p className="text-xs text-neutral-500">
                        {isPast(r.dueAt) ? "Was due" : "Due"}{" "}
                        {format(r.dueAt, "MMM d, yyyy")}
                        {!isPast(r.dueAt) &&
                          ` · in ${formatDistanceToNowStrict(r.dueAt)}`}
                      </p>
                    )}
                  </div>
                  <StatusBadge
                    status={r.status as RowStatus}
                    dueAt={r.dueAt}
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
