import Link from "next/link";
import { AlertTriangle, ClipboardList, PenLine } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { computeAtRiskStudents } from "@/lib/engagement";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

export default async function LeaderDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  const groups = user.groupLeaderIds.length
    ? await db.group.findMany({
        where: { id: { in: user.groupLeaderIds } },
        select: {
          id: true,
          name: true,
          seasonId: true,
          students: { select: { studentUserId: true } },
        },
      })
    : [];

  const seasonId = groups[0]?.seasonId ?? null;
  const studentIds = groups.flatMap((g) => g.students.map((s) => s.studentUserId));

  const [atRisk, submissions, quizzes] = await Promise.all([
    seasonId && studentIds.length
      ? computeAtRiskStudents(seasonId, studentIds)
      : Promise.resolve([]),
    seasonId && studentIds.length
      ? db.submission.findMany({
          where: {
            studentUserId: { in: studentIds },
            assignment: { seasonId, deletedAt: null },
          },
          select: { status: true },
        })
      : Promise.resolve([]),
    seasonId
      ? db.quiz.findMany({
          where: { seasonId },
          select: {
            id: true,
            title: true,
            sessionId: true,
            grades: {
              where: studentIds.length ? { studentUserId: { in: studentIds } } : undefined,
              select: { score: true },
            },
            _count: { select: { grades: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const pendingReview = submissions.filter((s) => s.status === "SUBMITTED").length;
  const reviewed = submissions.filter(
    (s) => s.status === "REVIEWED" || s.status === "RETURNED",
  ).length;
  const drafts = submissions.filter((s) => s.status === "DRAFT").length;

  const quizzesGraded = quizzes.filter(
    (q) => q.grades.filter((g) => g.score !== null).length >= studentIds.length && studentIds.length > 0,
  ).length;
  const quizzesPending = quizzes.length - quizzesGraded;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Your groups overview</p>
      </div>

      {/* Assignment status */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <ClipboardList className="size-4 text-brand-teal-600" />
          <p className="text-sm font-bold text-brand-navy-900">Assignments</p>
          <Link
            href="/leader/submissions"
            className="ml-auto text-xs font-semibold text-brand-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100">
          {[
            { label: "Pending review", value: pendingReview, accent: pendingReview > 0 ? "text-warning-700" : "text-brand-navy-900" },
            { label: "Reviewed", value: reviewed, accent: "text-success-700" },
            { label: "Drafts", value: drafts, accent: "text-neutral-500" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className={`text-2xl font-black ${accent}`}>{value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz correction status */}
      {quizzes.length > 0 && (
        <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
            <PenLine className="size-4 text-brand-teal-600" />
            <p className="text-sm font-bold text-brand-navy-900">Quiz corrections</p>
            <Link
              href="/leader/quizzes"
              className="ml-auto text-xs font-semibold text-brand-teal-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-neutral-100">
            {[
              { label: "Pending", value: quizzesPending, accent: quizzesPending > 0 ? "text-warning-700" : "text-brand-navy-900" },
              { label: "Fully graded", value: quizzesGraded, accent: "text-success-700" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className={`text-2xl font-black ${accent}`}>{value}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-risk students */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <AlertTriangle className="size-4 text-error-500" />
          <p className="text-sm font-bold text-brand-navy-900">Students at risk</p>
          {atRisk.length > 0 && (
            <span className="ml-auto rounded-full bg-error-100 px-2 py-0.5 text-xs font-bold text-error-700">
              {atRisk.length}
            </span>
          )}
        </div>

        {atRisk.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={AlertTriangle}
              title="No students at risk"
              description="All students are within their absence budget."
            />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {atRisk.map((s) => (
              <li key={s.userId}>
                <Link
                  href={`/leader/students/${s.userId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy-900">
                      {s.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {s.absentCount} absent · {s.lateCount} late · {s.minutesUsed} min used
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-error-600">
                      +{s.minutesOver} min
                    </p>
                    <p className="text-[10px] text-neutral-400">over budget</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
