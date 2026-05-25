import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listStudentsForScope } from "@/lib/students-query";
import { PageHeader } from "@/components/layout/page-header";
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

  return (
    <>
      <PageHeader
        title="Students"
        description={`${rows.length} student${rows.length === 1 ? "" : "s"} in your seasons`}
        actions={
          <Button render={<Link href="/super/students/new" />}>New student</Button>
        }
      />
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
      <StudentsList rows={rows} basePath="/admin/students" />
    </>
  );
}
