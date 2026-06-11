import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, ClipboardList, PenLine, Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER", "ADMIN"]);

  const season = await db.season.findFirst({
    where: {
      ...(user.role === "ADMIN" ? { id: { in: user.seasonAdminIds } } : {}),
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true, title: true, code: true },
    orderBy: { startDate: "desc" },
  });

  const seasonId = season?.id ?? null;
  const now = new Date();

  const [students, nextSession, weeksCompleted, weeksTotal, attendanceRecords, subs, totalAssignments, quizzes] =
    seasonId
      ? await Promise.all([
          db.studentProfile.findMany({
            where: { activeSeasonId: seasonId, deletedAt: null },
            select: { userId: true, user: { select: { id: true, name: true } } },
          }),
          db.session.findFirst({
            where: { seasonId, startsAt: { gte: now } },
            orderBy: { startsAt: "asc" },
            select: {
              id: true,
              title: true,
              startsAt: true,
              location: true,
              youtubeUrl: true,
              durationMinutes: true,
            },
          }),
          db.session.count({ where: { seasonId, startsAt: { lte: now } } }),
          db.session.count({ where: { seasonId } }),
          db.attendance.findMany({
            where: { session: { seasonId } },
            select: { studentUserId: true, status: true },
          }),
          db.submission.findMany({
            where: { assignment: { seasonId, deletedAt: null } },
            select: { studentUserId: true, status: true },
          }),
          db.assignment.count({ where: { seasonId, deletedAt: null } }),
          db.quiz.findMany({
            where: { seasonId },
            select: { id: true, grades: { select: { score: true } } },
          }),
        ])
      : ([[], null, 0, 0, [], [], 0, []] as const);

  const studentIds = students.map((s) => s.userId);

  // Per-student attendance
  const attMap = new Map<number, { present: number; late: number }>();
  for (const r of attendanceRecords) {
    const cur = attMap.get(r.studentUserId) ?? { present: 0, late: 0 };
    if (r.status === "PRESENT") cur.present++;
    if (r.status === "LATE") cur.late++;
    attMap.set(r.studentUserId, cur);
  }

  const completedMap = new Map<number, number>();
  for (const s of subs) {
    if (s.status === "SUBMITTED" || s.status === "REVIEWED" || s.status === "RETURNED") {
      completedMap.set(s.studentUserId, (completedMap.get(s.studentUserId) ?? 0) + 1);
    }
  }

  const studentRows = students.map((s) => {
    const att = attMap.get(s.userId) ?? { present: 0, late: 0 };
    const attendancePct =
      weeksCompleted > 0
        ? Math.round(((att.present + att.late) / weeksCompleted) * 100)
        : null;
    const pending = Math.max(0, totalAssignments - (completedMap.get(s.userId) ?? 0));
    return { id: s.userId, name: s.user.name ?? "Student", attendancePct, pending };
  });

  // Lowest attendance first; null (no sessions yet) goes to end
  studentRows.sort((a, b) => (a.attendancePct ?? 101) - (b.attendancePct ?? 101));

  const avgAttendance =
    studentRows.length > 0
      ? Math.round(
          studentRows.reduce((sum, s) => sum + (s.attendancePct ?? 0), 0) / studentRows.length,
        )
      : null;

  const quizzesPending = quizzes.filter(
    (q) =>
      studentIds.length > 0 &&
      q.grades.filter((g) => g.score !== null).length < studentIds.length,
  ).length;

  const pendingReview = subs.filter((s) => s.status === "SUBMITTED").length;
  const reviewed = subs.filter((s) => s.status === "REVIEWED" || s.status === "RETURNED").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 p-4 shadow-[0_4px_20px_rgba(31,50,96,0.25)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-teal-300">
          {season?.title ?? "No active season"}
        </p>
        <p className="mt-2 text-3xl font-black text-white">
          {avgAttendance !== null ? `${avgAttendance}%` : "—"}
        </p>
        <p className="text-xs text-white/50">Season avg. attendance</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Students", value: studentIds.length },
            {
              label: `Week ${weeksCompleted}/${weeksTotal}`,
              value: `${weeksTotal > 0 ? Math.round((weeksCompleted / weeksTotal) * 100) : 0}%`,
            },
            {
              label: "Quizzes",
              value: quizzes.length > 0 ? `${quizzesPending} pending` : "None",
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white/10 px-2 py-1.5 text-center">
              <p className="text-sm font-black text-white">{value}</p>
              <p className="text-[10px] text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next session */}
      <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Next session
        </p>
        {nextSession ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-teal-500" />
              <div>
                <Link
                  href={`/admin/season/${season?.code}/sessions/${nextSession.id}`}
                  className="text-sm font-bold text-brand-navy-900 hover:underline"
                >
                  {nextSession.title}
                </Link>
                <p className="text-xs text-neutral-500">
                  {format(nextSession.startsAt, "EEE, MMM d · h:mm a")} ·{" "}
                  {nextSession.durationMinutes} min
                  {nextSession.location ? ` · ${nextSession.location}` : ""}
                </p>
                <Badge variant="teal" className="mt-1.5 text-[10px]">
                  {formatDistanceToNowStrict(nextSession.startsAt, { addSuffix: true })}
                </Badge>
              </div>
            </div>
            {nextSession.youtubeUrl && (
              <a
                href={nextSession.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-teal-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-teal-700"
              >
                Watch recording
              </a>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm italic text-neutral-400">No upcoming sessions.</p>
        )}
      </div>

      {/* All students */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <Users className="size-4 text-brand-teal-600" />
          <p className="text-sm font-bold text-brand-navy-900">All students</p>
          <Link
            href="/admin/students"
            className="ml-auto text-xs font-semibold text-brand-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        {studentRows.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={Users}
              title="No students enrolled"
              description="Students will appear here once enrolled in the active season."
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-neutral-100 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Student
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Attendance
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Assignments
              </p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {studentRows.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                  >
                    <p className="flex-1 truncate text-sm font-semibold text-brand-navy-900">
                      {s.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.attendancePct !== null && (
                        <span
                          className={`text-xs font-bold ${
                            s.attendancePct < 70
                              ? "text-error-600"
                              : s.attendancePct < 85
                                ? "text-warning-700"
                                : "text-success-700"
                          }`}
                        >
                          {s.attendancePct}%
                        </span>
                      )}
                      {s.pending > 0 && (
                        <Badge variant="warning" className="text-[10px]">
                          {s.pending} pending
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Assignments overview */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <ClipboardList className="size-4 text-brand-teal-600" />
          <p className="text-sm font-bold text-brand-navy-900">Assignments</p>
          <Link
            href="/admin/assignments"
            className="ml-auto text-xs font-semibold text-brand-teal-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-neutral-100">
          {[
            {
              label: "Pending review",
              value: pendingReview,
              accent: pendingReview > 0 ? "text-warning-700" : "text-brand-navy-900",
            },
            { label: "Reviewed", value: reviewed, accent: "text-success-700" },
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

      {/* Quizzes overview */}
      {quizzes.length > 0 && (
        <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
            <PenLine className="size-4 text-brand-teal-600" />
            <p className="text-sm font-bold text-brand-navy-900">Quizzes</p>
            <Link
              href="/admin/quizzes"
              className="ml-auto text-xs font-semibold text-brand-teal-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-neutral-100">
            {[
              {
                label: "Pending",
                value: quizzesPending,
                accent: quizzesPending > 0 ? "text-warning-700" : "text-brand-navy-900",
              },
              {
                label: "Fully graded",
                value: quizzes.length - quizzesPending,
                accent: "text-success-700",
              },
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

      {/* At-risk callout */}
      {studentRows.some((s) => s.attendancePct !== null && s.attendancePct < 70) && (
        <div className="flex items-start gap-3 rounded-xl bg-error-50 p-4 ring-1 ring-error-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error-500" />
          <div>
            <p className="text-xs font-bold text-error-800">Students below 70% attendance</p>
            <p className="mt-0.5 text-xs text-error-600">
              {studentRows
                .filter((s) => s.attendancePct !== null && s.attendancePct < 70)
                .map((s) => s.name)
                .join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
