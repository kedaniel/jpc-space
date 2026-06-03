import { format } from "date-fns";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { isLeaderInSeason } from "@/lib/rbac";
import { loadSessionById } from "@/lib/sessions-query";
import { openCheckInAction, closeCheckInAction } from "@/lib/session-actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckInQr } from "@/components/sessions/check-in-qr";
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

  const checkInOpen = !!session.checkInOpenAt && !session.checkInClosedAt;
  const checkInUrl = session.checkInToken
    ? `${process.env.AUTH_URL}/checkin/${session.checkInToken}`
    : null;

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
            <form
              action={async () => {
                "use server";
                await closeCheckInAction(session.id);
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Close check-in
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await openCheckInAction(session.id);
              }}
            >
              <Button type="submit" size="sm">
                Open check-in
              </Button>
            </form>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {checkInOpen && checkInUrl && (
            <CheckInQr url={checkInUrl} sessionId={session.id} />
          )}
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
