import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { JpcEventManagerClient } from "./jpc-event-manager-client";

export const metadata: Metadata = { title: "JPC Events" };

export default async function SuperEventsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const events = await listJpcEvents({ includeAlumniOnly: true });

  return (
    <>
      <PageHeader
        title="JPC Events"
        description="Organisation-wide events visible on all members' calendars."
      />
      <JpcEventManagerClient events={events} />
    </>
  );
}
