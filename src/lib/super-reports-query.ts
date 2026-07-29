import { db } from "@/lib/db";

export interface SeasonEnrollmentCount {
  seasonId: number;
  program: string;
  year: number;
  title: string;
  status: string;
  activeCount: number;
  completedCount: number;
  droppedCount: number;
}

export interface AlumniByYear {
  year: number;
  count: number;
}

export interface SuperReportsData {
  totalStudents: number;
  totalAlumni: number;
  activeSeasonCount: number;
  seasons: SeasonEnrollmentCount[];
  alumniByYear: AlumniByYear[];
}

/** Cross-season roll-ups for the SUPER reports page: students per season + alumni counts. */
export async function loadSuperReports(): Promise<SuperReportsData> {
  const [totalStudents, totalAlumni, seasons, alumni] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: null } }),
    db.user.count({ where: { role: "STUDENT", deletedAt: null, graduationYear: { not: null } } }),
    db.season.findMany({
      where: { deletedAt: null },
      orderBy: [{ year: "desc" }, { program: "asc" }],
      select: {
        id: true,
        program: true,
        year: true,
        title: true,
        status: true,
        enrollments: { select: { status: true } },
      },
    }),
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null, graduationYear: { not: null } },
      select: { graduationYear: true },
    }),
  ]);

  const seasonRows: SeasonEnrollmentCount[] = seasons.map((s) => {
    let active = 0;
    let completed = 0;
    let dropped = 0;
    for (const e of s.enrollments) {
      if (e.status === "ACTIVE") active += 1;
      else if (e.status === "COMPLETED") completed += 1;
      else if (e.status === "WITHDRAWN") dropped += 1;
    }
    return {
      seasonId: s.id,
      program: s.program,
      year: s.year,
      title: s.title,
      status: s.status,
      activeCount: active,
      completedCount: completed,
      droppedCount: dropped,
    };
  });

  const byYear = new Map<number, number>();
  for (const a of alumni) {
    if (a.graduationYear == null) continue;
    byYear.set(a.graduationYear, (byYear.get(a.graduationYear) ?? 0) + 1);
  }
  const alumniByYear: AlumniByYear[] = [...byYear.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  return {
    totalStudents,
    totalAlumni,
    activeSeasonCount: seasons.filter((s) => s.status === "ACTIVE").length,
    seasons: seasonRows,
    alumniByYear,
  };
}
