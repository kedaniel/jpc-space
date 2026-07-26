import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listDroppedStudents } from "@/lib/students-query";
import { DroppedStudentsList } from "@/components/students/dropped-students-list";

export const metadata: Metadata = { title: "Dropped students" };

export default async function AdminDroppedStudentsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);
  const rows = await listDroppedStudents(user);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Dropped students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {`${rows.length} student${rows.length === 1 ? "" : "s"} dropped from your seasons`}
        </p>
      </div>
      <DroppedStudentsList rows={rows} basePath="/admin/students" />
    </div>
  );
}
