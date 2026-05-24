import { format } from "date-fns";

import { db } from "@/lib/db";
import { computeEngagementForStudent } from "@/lib/engagement";

export interface ReportFilters {
  seasonIds: number[]; // empty = all visible
  from?: Date;
  to?: Date;
}

export interface AttendancePoint {
  date: string; // ISO yyyy-MM-dd
  pct: number; // 0–100
}

export interface SubmissionRateRow {
  title: string;
  submittedPct: number;
  total: number;
  submitted: number;
}

export interface EngagementBucketRow {
  name: "High" | "Medium" | "Low" | "At risk";
  value: number;
}

export interface AtRiskRow {
  studentUserId: number;
  name: string | null;
  email: string;
  seasonTitle: string | null;
  attendancePct: number;
  submissionPct: number;
  score: number;
}

export interface ReportsData {
  attendanceTrend: AttendancePoint[];
  submissionRates: SubmissionRateRow[];
  engagementBuckets: EngagementBucketRow[];
  atRisk: AtRiskRow[];
  rawStudents: AtRiskRow[]; // unsorted full list for CSV export
}

const AT_RISK_BUCKETS = [
  { name: "High" as const, min: 80 },
  { name: "Medium" as const, min: 60 },
  { name: "Low" as const, min: 40 },
  { name: "At risk" as const, min: 0 },
];

function bucketFor(score: number): EngagementBucketRow["name"] {
  for (const b of AT_RISK_BUCKETS) {
    if (score >= b.min) return b.name;
  }
  return "At risk";
}

export async function loadReportsData(filters: ReportFilters): Promise<ReportsData> {
  // Resolve season scope.
  const seasonWhere = filters.seasonIds.length > 0 ? { id: { in: filters.seasonIds } } : {};
  const seasons = await db.season.findMany({
    where: { deletedAt: null, ...seasonWhere },
    select: { id: true, title: true },
  });
  const seasonIds = seasons.map((s) => s.id);
  if (seasonIds.length === 0) {
    return { attendanceTrend: [], submissionRates: [], engagementBuckets: [], atRisk: [], rawStudents: [] };
  }
  const seasonTitleById = new Map(seasons.map((s) => [s.id, s.title]));

  // Attendance trend: per-session attendance %.
  const dateWhere = {
    ...(filters.from ? { gte: filters.from } : {}),
    ...(filters.to ? { lte: filters.to } : {}),
  };
  const sessions = await db.session.findMany({
    where: {
      seasonId: { in: seasonIds },
      startsAt: { lte: new Date(), ...dateWhere },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      seasonId: true,
      _count: { select: { attendance: true } },
      attendance: {
        select: { status: true },
      },
    },
  });
  const enrollmentsBySeason = new Map<number, number>();
  for (const sid of seasonIds) {
    enrollmentsBySeason.set(
      sid,
      await db.seasonEnrollment.count({ where: { seasonId: sid, status: "ACTIVE" } }),
    );
  }
  const attendanceTrend: AttendancePoint[] = sessions.map((s) => {
    const enrolled = enrollmentsBySeason.get(s.seasonId) ?? 0;
    const present = s.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const pct = enrolled > 0 ? Math.round((present / enrolled) * 100) : 0;
    return { date: format(s.startsAt, "MMM d"), pct };
  });

  // Submission completion per assignment.
  const assignments = await db.assignment.findMany({
    where: { seasonId: { in: seasonIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      isAllGroups: true,
      seasonId: true,
      targets: { select: { groupId: true } },
      _count: { select: { submissions: { where: { status: { not: "DRAFT" } } } } },
    },
  });
  const submissionRates: SubmissionRateRow[] = await Promise.all(
    assignments.map(async (a) => {
      const expected = a.isAllGroups
        ? await db.seasonEnrollment.count({ where: { seasonId: a.seasonId, status: "ACTIVE" } })
        : await db.groupStudent.count({ where: { groupId: { in: a.targets.map((t) => t.groupId) } } });
      const submitted = a._count.submissions;
      const submittedPct = expected > 0 ? Math.round((submitted / expected) * 100) : 0;
      return { title: a.title, submitted, total: expected, submittedPct };
    }),
  );

  // Engagement distribution + at-risk: compute per active student across all seasons in scope.
  const enrollments = await db.seasonEnrollment.findMany({
    where: { seasonId: { in: seasonIds }, status: "ACTIVE" },
    select: {
      studentUserId: true,
      seasonId: true,
      studentUser: { select: { name: true, email: true } },
    },
  });
  const rawStudents: AtRiskRow[] = [];
  for (const e of enrollments) {
    const eng = await computeEngagementForStudent(e.studentUserId, e.seasonId);
    rawStudents.push({
      studentUserId: e.studentUserId,
      name: e.studentUser.name,
      email: e.studentUser.email,
      seasonTitle: seasonTitleById.get(e.seasonId) ?? null,
      attendancePct: eng.attendancePct,
      submissionPct: eng.submissionPct,
      score: eng.score,
    });
  }
  const bucketCounts = new Map<EngagementBucketRow["name"], number>([
    ["High", 0],
    ["Medium", 0],
    ["Low", 0],
    ["At risk", 0],
  ]);
  for (const s of rawStudents) {
    const b = bucketFor(s.score);
    bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
  }
  const engagementBuckets: EngagementBucketRow[] = Array.from(bucketCounts).map(([name, value]) => ({
    name,
    value,
  }));
  const atRisk = rawStudents
    .filter((s) => s.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  return { attendanceTrend, submissionRates, engagementBuckets, atRisk, rawStudents };
}

export function toCsv(rows: AtRiskRow[]): string {
  const header = "Student,Email,Season,Attendance %,Submission %,Score";
  const lines = rows.map((r) =>
    [
      JSON.stringify(r.name ?? ""),
      JSON.stringify(r.email),
      JSON.stringify(r.seasonTitle ?? ""),
      r.attendancePct,
      r.submissionPct,
      r.score,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
