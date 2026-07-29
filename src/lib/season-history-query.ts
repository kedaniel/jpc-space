import { db } from "@/lib/db";

export interface SeasonHistoryRow {
  seasonId: number;
  title: string;
  startDate: Date;
  endDate: Date;
  groupName: string | null;
  attendancePct: number;
  curriculum: { id: number; title: string; startsAt: Date }[];
}

/**
 * Privacy-safe past-season history for a student/alumnus: attendance % and the
 * curriculum (session titles + dates) only. Deliberately fetches NO submissions,
 * feedback, or engagement notes. `excludeSeasonId` drops the current active season.
 */
export async function loadSeasonHistory(
  studentUserId: number,
  excludeSeasonId?: number | null,
): Promise<SeasonHistoryRow[]> {
  const enrollments = await db.seasonEnrollment.findMany({
    where: {
      studentUserId,
      ...(excludeSeasonId ? { seasonId: { not: excludeSeasonId } } : {}),
    },
    orderBy: { enrolledAt: "desc" },
    select: {
      seasonId: true,
      season: { select: { title: true, startDate: true, endDate: true } },
      group: { select: { name: true } },
    },
  });
  if (enrollments.length === 0) return [];

  const seasonIds = enrollments.map((e) => e.seasonId);
  const [allSessions, presentRecords] = await Promise.all([
    db.session.findMany({
      where: { seasonId: { in: seasonIds } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, seasonId: true },
    }),
    db.attendance.findMany({
      where: {
        studentUserId,
        session: { seasonId: { in: seasonIds } },
        status: { in: ["PRESENT", "LATE"] },
      },
      select: { session: { select: { seasonId: true } } },
    }),
  ]);

  const attendanceBySeason = new Map<number, { total: number; present: number }>();
  const curriculaBySeason = new Map<number, { id: number; title: string; startsAt: Date }[]>();
  for (const s of allSessions) {
    const entry = attendanceBySeason.get(s.seasonId) ?? { total: 0, present: 0 };
    entry.total += 1;
    attendanceBySeason.set(s.seasonId, entry);
    const curriculum = curriculaBySeason.get(s.seasonId) ?? [];
    curriculum.push({ id: s.id, title: s.title, startsAt: s.startsAt });
    curriculaBySeason.set(s.seasonId, curriculum);
  }
  for (const r of presentRecords) {
    const entry = attendanceBySeason.get(r.session.seasonId);
    if (entry) entry.present += 1;
  }

  return enrollments.map((e) => {
    const att = attendanceBySeason.get(e.seasonId) ?? { total: 0, present: 0 };
    return {
      seasonId: e.seasonId,
      title: e.season.title,
      startDate: e.season.startDate,
      endDate: e.season.endDate,
      groupName: e.group?.name ?? null,
      attendancePct: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
      curriculum: curriculaBySeason.get(e.seasonId) ?? [],
    };
  });
}
