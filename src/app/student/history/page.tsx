import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSeasonHistory } from "@/lib/season-history-query";
import { SeasonHistory } from "@/components/students/season-history";

export const metadata = { title: "History" };

/**
 * Privacy-critical page: shows past seasons the student participated in via the
 * shared SeasonHistory (attendance % + curriculum titles/dates only — NO
 * submissions, feedback, or notes).
 */
export default async function StudentHistoryPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const rows = await loadSeasonHistory(user.userId, user.activeSeasonId);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seasons you&apos;ve participated in</p>
      </div>
      <SeasonHistory
        rows={rows}
        emptyDescription="Once you complete a season, it'll appear here."
      />
    </div>
  );
}
