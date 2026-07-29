import Link from "next/link";
import { GraduationCap, History } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAlumnus } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UpcomingEventsCard } from "@/components/events/upcoming-events-card";

export const metadata = { title: "Home" };

export default async function AlumniDashboard() {
  const user = await getCurrentUserOrRedirect();
  if (!isAlumnus(user)) redirect("/login");

  const account = await db.user.findUnique({
    where: { id: user.userId },
    select: { name: true, graduationYear: true },
  });
  const firstName = account?.name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 text-brand-teal-700 dark:text-brand-teal-300">
          <GraduationCap className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            JPCS Alumnus · Class of {account?.graduationYear}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black text-brand-navy-900 dark:text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your journey with the community continues. Catch up on what&apos;s coming, and revisit
          the seasons you were part of.
        </p>
        <div className="mt-4">
          <Button variant="outline" render={<Link href="/alumni/history" />}>
            <History /> View my history
          </Button>
        </div>
      </div>

      <UpcomingEventsCard user={user} />
    </div>
  );
}
