import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Clock, MapPin, Video } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSessionById } from "@/lib/sessions-query";
import { loadStudentVideoQuiz } from "@/lib/video-quiz-query";
import { parseYouTubeId } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";
import { StudentCheckinButton } from "@/components/sessions/student-checkin-button";
import { InteractiveVideoPlayer } from "@/components/sessions/interactive-video-player";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Session" };

export default async function StudentSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const { id } = await params;
  const session = await loadSessionById(Number(id), { includeCheckInToken: false });

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
  const isOnline = Boolean(session.youtubeUrl);

  const videoId = session.youtubeUrl ? parseYouTubeId(session.youtubeUrl) : null;
  const quiz = videoId ? await loadStudentVideoQuiz(session.id, user.userId) : null;
  const hasInteractiveVideo = videoId !== null && quiz !== null && quiz.questions.length > 0;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Header */}
      <div>
        <Link
          href="/student/calendar"
          className="text-xs font-semibold text-brand-teal-700 hover:underline dark:text-brand-teal-300"
        >
          ← Calendar
        </Link>
        {/* Hero card */}
        <div className="mt-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={isOnline ? "teal" : "outline"}>
              {isOnline ? "Online" : "In-person"}
            </Badge>
          </div>
          <h1 className="text-xl font-black text-brand-navy-900 dark:text-foreground">{session.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(session.startsAt, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Interactive video quiz, or a plain link when there are no questions */}
      {hasInteractiveVideo && videoId && quiz ? (
        <InteractiveVideoPlayer sessionId={session.id} videoId={videoId} quiz={quiz} />
      ) : (
        session.youtubeUrl && (
          <a
            href={session.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-teal-600 px-4 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(93,185,188,0.35)] transition-colors hover:bg-brand-teal-700"
          >
            <Video className="size-4 shrink-0" />
            Watch recording
          </a>
        )
      )}

      {/* Details card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Details
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0 text-brand-teal-600" />
            <span>
              {format(session.startsAt, "h:mm a")} –{" "}
              {format(endsAt, "h:mm a")} · {session.durationMinutes} min
            </span>
          </div>
          {session.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
