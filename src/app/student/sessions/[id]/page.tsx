import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Clock, MapPin } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentCheckinButton } from "@/components/sessions/student-checkin-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Session" };

export default async function StudentSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const { id } = await params;
  const session = await loadSessionById(Number(id));

  const enrollment = await db.seasonEnrollment.findFirst({
    where: { seasonId: session.seasonId, studentUserId: user.userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) notFound();

  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() runs once per request
  const now = Date.now();
  const isCheckInOpen =
    !!session.checkInOpenAt &&
    !session.checkInClosedAt &&
    now - session.checkInOpenAt.getTime() < 3 * 60 * 60 * 1000;

  const endsAt = new Date(session.startsAt.getTime() + session.durationMinutes * 60 * 1000);

  return (
    <>
      <PageHeader
        title={session.title}
        description={format(session.startsAt, "EEE, MMM d, yyyy")}
      />

      <div className="flex flex-col gap-4 md:gap-6">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span>
                {format(session.startsAt, "h:mm a")} – {format(endsAt, "h:mm a")} ·{" "}
                {session.durationMinutes} min
              </span>
            </div>
            {session.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{session.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <StudentCheckinButton isCheckInOpen={isCheckInOpen} />
      </div>
    </>
  );
}
