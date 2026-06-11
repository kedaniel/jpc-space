import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Calendar" };

export default async function AdminCalendarRedirectPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);

  const seasonIds =
    user.role === "ADMIN" ? user.seasonAdminIds : undefined;

  // Prefer the most recent ACTIVE season; fall back to any non-deleted season
  const season =
    (await db.season.findFirst({
      where: { ...(seasonIds ? { id: { in: seasonIds } } : {}), deletedAt: null, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: { code: true },
    })) ??
    (await db.season.findFirst({
      where: { ...(seasonIds ? { id: { in: seasonIds } } : {}), deletedAt: null },
      orderBy: { startDate: "desc" },
      select: { code: true },
    }));

  if (!season) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Calendar</h1>
          <p className="mt-1 text-sm text-neutral-500">No active season found.</p>
        </div>
      </div>
    );
  }

  redirect(`/admin/season/${season.code}/calendar`);
}
