import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listDroppedStudents } from "@/lib/students-query";
import { PageHeader } from "@/components/layout/page-header";
import { DroppedStudentsList } from "@/components/students/dropped-students-list";

export const metadata: Metadata = { title: "Dropped students" };

export default async function SuperDroppedStudentsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const rows = await listDroppedStudents(user);

  return (
    <>
      <PageHeader
        title="Dropped students"
        description={`${rows.length} student${rows.length === 1 ? "" : "s"} dropped without graduating`}
      />
      <DroppedStudentsList rows={rows} basePath="/super/students" />
    </>
  );
}
