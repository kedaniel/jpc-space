import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { getStorage } from "@/lib/storage";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentForm } from "@/components/students/student-form";
import { AvatarUpload } from "@/components/students/avatar-upload";

export const metadata = { title: "My profile" };

function initialsFor(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default async function StudentProfilePage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const userRow = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      email: true,
      avatarPath: true,
      studentProfile: {
        select: {
          university: true,
          year: true,
          phone: true,
          dateOfBirth: true,
          spiritualBackground: true,
          gifts: true,
          activeSeasonId: true,
        },
      },
    },
  });
  if (!userRow || !userRow.studentProfile) redirect("/student/dashboard");

  const storage = getStorage();
  const avatarUrl = userRow.avatarPath ? await storage.url(userRow.avatarPath) : null;
  const initials = initialsFor(userRow.name, userRow.email);

  return (
    <>
      <PageHeader
        title="My profile"
        description="Update your contact details, academic info, and faith background."
      />
      <Card>
        <CardContent className="pt-6 flex flex-col gap-6">
          <div className="flex justify-center">
            <AvatarUpload currentAvatarUrl={avatarUrl} initials={initials} />
          </div>
          <StudentForm
            mode="edit"
            studentUserId={user.userId}
            isSelf
            seasons={[]}
            redirectTo="/student/profile"
            defaultValues={{
              name: userRow.name ?? "",
              email: userRow.email,
              university: userRow.studentProfile.university,
              year: userRow.studentProfile.year,
              phone: userRow.studentProfile.phone,
              dateOfBirth: userRow.studentProfile.dateOfBirth,
              spiritualBackground: userRow.studentProfile.spiritualBackground,
              gifts: userRow.studentProfile.gifts,
              notes: null,
              activeSeasonId: userRow.studentProfile.activeSeasonId,
            }}
          />
          <StatCard
            label="Streak"
            value={streak > 0 ? `🔥 ${streak}` : streak}
          />
        </div>
      )}

      {/* Profile form */}
      <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Your details
        </p>
        <StudentForm
          mode="edit"
          studentUserId={user.userId}
          isSelf
          seasons={[]}
          redirectTo="/student/profile"
          defaultValues={{
            name: userRow.name ?? "",
            email: userRow.email,
            university: userRow.studentProfile.university,
            year: userRow.studentProfile.year,
            phone: userRow.studentProfile.phone,
            dateOfBirth: userRow.studentProfile.dateOfBirth,
            spiritualBackground: userRow.studentProfile.spiritualBackground,
            gifts: userRow.studentProfile.gifts,
            notes: null,
            activeSeasonId: userRow.studentProfile.activeSeasonId,
          }}
        />
      </div>
    </div>
  );
}
