import { format } from "date-fns";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { isLeaderInSeason } from "@/lib/rbac";
import { loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
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

  const studentRows = groupStudents.map((gs) => ({
    userId: gs.studentUser.id,
    name: gs.studentUser.name ?? "",
    checkedInAt: gs.studentUser.attendanceRecords[0]?.checkedInAt ?? null,
    status: (gs.studentUser.attendanceRecords[0]?.status ?? null) as AttendanceStatus | null,
  }));

  return (
    <>
      <PageHeader
        title={session.title}
        description={format(session.startsAt, "EEE, MMM d · h:mm a")}
      />

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
    </>
  );
}
