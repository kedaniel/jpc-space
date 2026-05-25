import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentForm } from "@/components/students/student-form";

export const metadata = { title: "My profile" };

export default async function StudentProfilePage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const userRow = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      email: true,
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

  return (
    <>
      <PageHeader
        title="My profile"
        description="Update your contact details, academic info, and faith background."
      />
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </>
  );
}
