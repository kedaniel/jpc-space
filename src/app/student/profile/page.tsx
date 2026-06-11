import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { getStorage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { StudentForm } from "@/components/students/student-form";
import { AvatarUpload } from "@/components/students/avatar-upload";
import { StatCard } from "@/components/students/stat-card";
import { computeEngagementForStudent, computeAttendanceBudget, computeAttendanceStreak } from "@/lib/engagement";

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

  const [engagement, budget] = userRow.studentProfile.activeSeasonId
    ? await Promise.all([
        computeEngagementForStudent(user.userId, userRow.studentProfile.activeSeasonId),
        computeAttendanceBudget(user.userId, userRow.studentProfile.activeSeasonId),
      ])
    : ([null, null] as const);

  const attendancePct = budget
    ? Math.max(0, Math.round(100 - budget.budgetPct))
    : null;

  const streak = userRow.studentProfile.activeSeasonId
    ? await computeAttendanceStreak(user.userId, userRow.studentProfile.activeSeasonId)
    : 0;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Navy hero card */}
      <div className="rounded-xl bg-gradient-to-br from-brand-navy-900 to-brand-navy-700 p-4 shadow-[0_4px_20px_rgba(31,50,96,0.25)]">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <AvatarUpload currentAvatarUrl={avatarUrl} initials={initials} />
          </div>
          <div>
            <p className="text-xl font-black text-white">
              {userRow.name ?? userRow.email}
            </p>
            <p className="text-xs text-white/50">JPC Space Student</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="teal">Student</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {engagement && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Attendance"
            value={attendancePct !== null ? `${attendancePct}%` : "—"}
          />
          <StatCard
            label="Assignments"
            value={`${engagement.submissionsCompleted}/${engagement.submissionsExpected}`}
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
