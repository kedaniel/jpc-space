import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listStudentsForScope } from "@/lib/students-query";
import { getStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { StudentsList } from "@/components/students/students-list";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN"]);
  const { q } = await searchParams;
  const rows = await listStudentsForScope(user, q);
  const storage = getStorage();
  const rowsWithAvatars = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      avatarUrl: r.avatarPath ? await storage.url(r.avatarPath) : null,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900">Students</h1>
          <p className="mt-1 text-sm text-neutral-500">{`${rowsWithAvatars.length} student${rowsWithAvatars.length === 1 ? "" : "s"} in your seasons`}</p>
        </div>
        <Button render={<Link href="/super/students/new" />}>New student</Button>
      </div>
      <form action="/admin/students" method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, universityâ€¦"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <StudentsList rows={rowsWithAvatars} basePath="/admin/students" />
    </div>
  );
}
