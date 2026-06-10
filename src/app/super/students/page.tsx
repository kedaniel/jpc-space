import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listStudentsForScope } from "@/lib/students-query";
import { getStorage } from "@/lib/storage";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StudentsList } from "@/components/students/students-list";

export const metadata: Metadata = { title: "Students" };

export default async function SuperStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
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
    <>
      <PageHeader
        title="Students"
        description={`${rowsWithAvatars.length} student${rowsWithAvatars.length === 1 ? "" : "s"}`}
        actions={
          <Button render={<Link href="/super/students/new" />}>New student</Button>
        }
      />
      <SearchBox initial={q} action="/super/students" />
      <StudentsList rows={rowsWithAvatars} basePath="/super/students" />
    </>
  );
}

function SearchBox({ initial, action }: { initial?: string; action: string }) {
  return (
    <form action={action} method="get" className="mb-4 flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={initial}
        placeholder="Search name, email, universityâ€¦"
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
