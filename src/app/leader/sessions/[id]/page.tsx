import { format } from "date-fns";
import { notFound } from "next/navigation";
import { PenLine, QrCode } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { isLeaderInSeason } from "@/lib/rbac";
import { loadSessionById } from "@/lib/sessions-query";
import { listQuizzesForSession } from "@/lib/quiz-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckInAttendanceList } from "@/components/sessions/check-in-attendance-list";
import { AttendanceStatus } from "@/generated/prisma/enums";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Session" };

export default async function LeaderSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);
  const { id } = await params;
  const session = await loadSessionById(Number(id));

  if (!(await isLeaderInSeason(user, session.seasonId))) {
    notFound();
  }

  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() runs once per request
  const now = Date.now();
  const checkInOpen =
    !!session.checkInOpenAt &&
    !session.checkInClosedAt &&
    now - session.checkInOpenAt.getTime() < 3 * 60 * 60 * 1000;

  const groupStudents = await db.groupStudent.findMany({
    where: {
      group: {
        seasonId: session.seasonId,
        id: { in: user.groupLeaderIds },
      },
    },
    select: {
      studentUser: {
        select: {
          id: true,
          name: true,
          attendanceRecords: {
            where: { sessionId: session.id },
            select: { status: true, checkedInAt: true },
          },
        },
      },
    },
  });

  const quizzes = await listQuizzesForSession(session.id);

  const studentRows = groupStudents.map((gs) => ({
    userId: gs.studentUser.id,
    name: gs.studentUser.name ?? "",
    checkedInAt: gs.studentUser.attendanceRecords[0]?.checkedInAt ?? null,
    status: (gs.studentUser.attendanceRecords[0]?.status ?? null) as AttendanceStatus | null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">{session.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{format(session.startsAt, "EEE, MMM d · h:mm a")}</p>
      </div>

      {quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="size-4 text-brand-teal-600" />
              Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-neutral-100">
              {quizzes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy-900">{q.title}</p>
                    <p className="text-xs text-neutral-500">Max score: {q.maxScore}</p>
                  </div>
                  <Link
                    href={`/leader/sessions/${session.id}/quiz/${q.id}`}
                    className="text-xs font-semibold text-brand-teal-700 hover:underline"
                  >
                    Grade →
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-4" />
            Check-in
          </CardTitle>
          {checkInOpen ? (
            <Badge variant="success">Open</Badge>
          ) : (
            <Badge variant="outline">Closed</Badge>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <CheckInAttendanceList
            sessionId={session.id}
            students={studentRows}
            isOpen={checkInOpen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
