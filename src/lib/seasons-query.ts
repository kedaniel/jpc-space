import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import type { SeasonDetailData } from "@/components/seasons/season-detail";

export async function loadSeasonByCode(code: string): Promise<SeasonDetailData> {
  const season = await db.season.findFirst({
    where: { code, deletedAt: null },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { sessions: true, enrollments: true } },
      groups: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { students: true } },
          leaders: {
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!season) notFound();

  return {
    id: season.id,
    code: season.code,
    title: season.title,
    description: season.description,
    status: season.status,
    startDate: season.startDate,
    endDate: season.endDate,
    sessionCount: season._count.sessions,
    studentCount: season._count.enrollments,
    groups: season.groups.map((g) => ({
      id: g.id,
      name: g.name,
      studentCount: g._count.students,
      leaderNames: g.leaders
        .map((l) => l.user.name)
        .filter((n): n is string => Boolean(n)),
    })),
  };
}
