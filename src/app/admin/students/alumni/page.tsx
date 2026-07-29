import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listAlumni } from "@/lib/students-query";
import { AlumniList } from "@/components/students/alumni-list";

export const metadata: Metadata = { title: "Alumni" };

export default async function AdminAlumniPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);
  const rows = await listAlumni(user);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Alumni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {`${rows.length} graduated ${rows.length === 1 ? "student" : "students"} from your seasons`}
        </p>
      </div>
      <AlumniList rows={rows} basePath="/admin/students" />
    </div>
  );
}
