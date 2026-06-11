import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Calendar" };

export default async function AdminCalendarRedirectPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);

  const season = await db.season.findFirst({
    where: {
      ...(user.role === "ADMIN" ? { id: { in: user.seasonAdminIds } } : {}),
      deletedAt: null,
      status: "ACTIVE",
    },
    orderBy: { startDate: "desc" },
    select: { code: true },
  });

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
