import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listAlumni } from "@/lib/students-query";
import { PageHeader } from "@/components/layout/page-header";
import { AlumniList } from "@/components/students/alumni-list";

export const metadata: Metadata = { title: "Alumni" };

export default async function SuperAlumniPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const rows = await listAlumni(user);

  return (
    <>
      <PageHeader
        title="Alumni"
        description={`${rows.length} graduated ${rows.length === 1 ? "student" : "students"}`}
      />
      <AlumniList rows={rows} basePath="/super/students" />
    </>
  );
}
