import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import type { NotificationPrefsInput } from "@/lib/settings-actions";

const DEFAULT_PREFS: NotificationPrefsInput = {
  assignmentCreated: true,
  submissionReviewed: true,
  sessionRescheduled: true,
  lowAttendanceFlag: true,
  mentorFollowup: true,
};

export async function SettingsPageBody() {
  const user = await getCurrentUserOrRedirect();
  const row = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      email: true,
      notificationPreference: true,
    },
  });

  const prefs: NotificationPrefsInput = row?.notificationPreference
    ? {
        assignmentCreated: row.notificationPreference.assignmentCreated,
        submissionReviewed: row.notificationPreference.submissionReviewed,
        sessionRescheduled: row.notificationPreference.sessionRescheduled,
        lowAttendanceFlag: row.notificationPreference.lowAttendanceFlag,
        mentorFollowup: row.notificationPreference.mentorFollowup,
      }
    : DEFAULT_PREFS;

  return (
    <>
      <PageHeader title="Settings" description="Profile, password, and notification preferences." />
      <SettingsForm
        initialName={row?.name ?? ""}
        email={row?.email ?? ""}
        initialPrefs={prefs}
      />
    </>
  );
}
