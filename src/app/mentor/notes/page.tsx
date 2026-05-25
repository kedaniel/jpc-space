import Link from "next/link";
import { format } from "date-fns";
import { Flag } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MentorNoteComposer } from "@/components/students/mentor-note-composer";

export const metadata = { title: "My notes" };

export default async function MentorNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["MENTOR"]);

  const { student: studentParam } = await searchParams;
  const studentId = studentParam ? Number(studentParam) : null;

  const [students, notes] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.engagementNote.findMany({
      where: {
        authorUserId: user.userId,
        ...(studentId ? { studentUserId: studentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        body: true,
        visibility: true,
        followUpFlagged: true,
        createdAt: true,
        studentUser: { select: { id: true, name: true, email: true } },
        season: { select: { title: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="My notes"
        description={`${notes.length} note${notes.length === 1 ? "" : "s"} you've authored`}
      />

      <div className="mb-4">
        <MentorNoteComposer students={students} />
      </div>

      <form action="/mentor/notes" method="get" className="mb-4 flex flex-wrap gap-2">
        <select
          name="student"
          defaultValue={studentParam ?? ""}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name ?? s.email}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Filter
        </button>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No notes yet"
          description="Write your first note above."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      href={`/mentor/students/${n.studentUser.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {n.studentUser.name ?? n.studentUser.email}
                    </Link>
                    <span>آ·</span>
                    <span>{format(n.createdAt, "MMM d, yyyy")}</span>
                    {n.season?.title && (
                      <>
                        <span>آ·</span>
                        <span>{n.season.title}</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {n.visibility}
                    </Badge>
                    {n.followUpFlagged && (
                      <Badge variant="warning" className="text-[10px]">
                        Follow up
                      </Badge>
                    )}
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: n.body }}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
