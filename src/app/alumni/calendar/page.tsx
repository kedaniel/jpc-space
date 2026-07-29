import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAlumnus } from "@/lib/rbac";
import { UpcomingEventsCard } from "@/components/events/upcoming-events-card";

export const metadata = { title: "Events" };

export default async function AlumniEventsPage() {
  const user = await getCurrentUserOrRedirect();
  if (!isAlumnus(user)) redirect("/login");

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming JPC community events</p>
      </div>
      <UpcomingEventsCard user={user} />
    </div>
  );
}
