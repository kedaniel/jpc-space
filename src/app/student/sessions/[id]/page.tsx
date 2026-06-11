import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Clock, MapPin, Video } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSessionById } from "@/lib/sessions-query";
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

  const endsAt = new Date(
    session.startsAt.getTime() + session.durationMinutes * 60 * 1000,
  );
  const isPast = session.startsAt.getTime() < now;
  const isOnline = Boolean(session.youtubeUrl);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Header */}
      <div>
        <Link
          href="/student/calendar"
          className="text-xs font-semibold text-brand-teal-700 hover:underline"
        >
          ← Calendar
        </Link>
        {/* Navy hero card */}
        <div className="mt-2 rounded-xl bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 p-4 shadow-[0_4px_20px_rgba(31,50,96,0.25)]">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
              {isOnline ? "Online" : "In-person"}
            </span>
          </div>
          <h1 className="text-xl font-black text-white">{session.title}</h1>
          <p className="mt-1 text-sm text-white/60">
            {format(session.startsAt, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* YouTube button */}
      {session.youtubeUrl && (
        <a
          href={session.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-teal-600 px-4 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(93,185,188,0.35)] transition-colors hover:bg-brand-teal-700"
        >
          <Video className="size-4 shrink-0" />
          {isPast ? "Watch recording" : "Join session"}
        </a>
      )}

      {/* Details card */}
      <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Details
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="size-4 shrink-0 text-brand-teal-600" />
            <span>
              {format(session.startsAt, "h:mm a")} –{" "}
              {format(endsAt, "h:mm a")} · {session.durationMinutes} min
            </span>
          </div>
          {session.location && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <MapPin className="size-4 shrink-0 text-brand-teal-600" />
              <span>{session.location}</span>
            </div>
          )}
        </div>
      </div>

      <StudentCheckinButton isCheckInOpen={isCheckInOpen} />
    </div>
  );
}
