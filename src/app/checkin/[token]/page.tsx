import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Clock, XCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { checkInByTokenAction } from "@/lib/attendance-actions";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Check in" };

export default async function CheckInPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/checkin/${token}`);
  }

  const result = await checkInByTokenAction(token);

  if (result.ok) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-200">
          <CheckCircle className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold text-foreground">
          {result.status === "PRESENT" ? "You're checked in!" : "Checked in — late"}
        </h1>
        {result.status === "LATE" && (
          <p className="text-muted-foreground">
            {result.minutesLate} minute{result.minutesLate === 1 ? "" : "s"} after session start.
          </p>
        )}
        <Link
          href="/student/dashboard"
          className="mt-2 text-sm text-brand-teal-600 underline-offset-4 hover:underline dark:text-brand-teal-400"
        >
          Go to dashboard
        </Link>
      </main>
    );
  }

  const messages: Record<string, string> = {
    invalid_token: "This check-in link is not valid.",
    not_open: "Check-in hasn't been opened yet. Ask your leader to open it.",
    closed: "Check-in is now closed.",
    not_enrolled: "You are not enrolled in this season.",
    already_checked_in: `You already checked in (${result.currentStatus?.toLowerCase() ?? "recorded"}).`,
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-200">
        {result.error === "already_checked_in" ? (
          <Clock className="size-8" />
        ) : (
          <XCircle className="size-8" />
        )}
      </span>
      <h1 className="text-2xl font-semibold text-foreground">
        {result.error === "already_checked_in" ? "Already checked in" : "Can't check in"}
      </h1>
      <p className="text-muted-foreground">{messages[result.error]}</p>
      <Link
        href="/student/dashboard"
        className="mt-2 text-sm text-brand-teal-600 underline-offset-4 hover:underline dark:text-brand-teal-400"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
