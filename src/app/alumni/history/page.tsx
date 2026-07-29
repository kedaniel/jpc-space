import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAlumnus } from "@/lib/rbac";
import { loadSeasonHistory } from "@/lib/season-history-query";
import { SeasonHistory } from "@/components/students/season-history";

export const metadata = { title: "My History" };

export default async function AlumniHistoryPage() {
  const user = await getCurrentUserOrRedirect();
  if (!isAlumnus(user)) redirect("/login");

  // Alumni have no active season, so all their enrollments are past seasons.
  const rows = await loadSeasonHistory(user.userId, null);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">My History</h1>
        <p className="mt-1 text-sm text-muted-foreground">The seasons you journeyed through</p>
      </div>
      <SeasonHistory rows={rows} emptyDescription="Your completed seasons will appear here." />
    </div>
  );
}
