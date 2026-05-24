"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  changePasswordAction,
  updateNotificationPreferencesAction,
  updateOwnProfileAction,
  type NotificationPrefsInput,
} from "@/lib/settings-actions";

interface SettingsFormProps {
  initialName: string;
  email: string;
  initialPrefs: NotificationPrefsInput;
}

const PREF_LABELS: { key: keyof NotificationPrefsInput; label: string; description: string }[] = [
  {
    key: "assignmentCreated",
    label: "New assignments",
    description: "When an admin creates an assignment you're targeted by.",
  },
  {
    key: "submissionReviewed",
    label: "Submission reviewed",
    description: "When a leader leaves feedback on your submission.",
  },
  {
    key: "sessionRescheduled",
    label: "Session rescheduled",
    description: "When a session you're enrolled in moves time.",
  },
  {
    key: "lowAttendanceFlag",
    label: "Low-attendance flags",
    description: "When a student you lead/admin misses 3 in a row.",
  },
  {
    key: "mentorFollowup",
    label: "Mentor follow-ups",
    description: "When a mentor flags a note for admin follow-up.",
  },
];

export function SettingsForm({ initialName, email, initialPrefs }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(initialName);
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Password fields.
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [pwInfo, setPwInfo] = React.useState<string | null>(null);
  const [pwFieldErrors, setPwFieldErrors] = React.useState<Record<string, string>>({});

  // Prefs.
  const [prefs, setPrefs] = React.useState<NotificationPrefsInput>(initialPrefs);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await updateOwnProfileAction(name);
      if (!result.ok) setError(result.error);
      else {
        setInfo("Profile saved.");
        router.refresh();
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwInfo(null);
    setPwFieldErrors({});
    startTransition(async () => {
      const result = await changePasswordAction(current, next, confirm);
      if (!result.ok) {
        setPwError(result.error);
        setPwFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setPwInfo("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  function savePrefs() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(prefs);
      if (!result.ok) setError(result.error);
      else setInfo("Preferences saved.");
    });
  }

  function togglePref(key: keyof NotificationPrefsInput) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <FormField label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Email" description="Change via the admin console.">
              <Input value={email} disabled />
            </FormField>
            {error && (
              <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-800">
                {info}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <FormField label="Current password" required error={pwFieldErrors.currentPassword}>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <FormField label="New password" required error={pwFieldErrors.newPassword}>
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm new password" required error={pwFieldErrors.confirm}>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            {pwError && (
              <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
                {pwError}
              </p>
            )}
            {pwInfo && (
              <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-800">
                {pwInfo}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {PREF_LABELS.map((p) => (
            <label
              key={p.key}
              className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </span>
              <input
                type="checkbox"
                checked={prefs[p.key]}
                onChange={() => togglePref(p.key)}
                className="mt-1 size-4"
              />
            </label>
          ))}
          <div className="flex justify-end">
            <Button type="button" onClick={savePrefs} disabled={pending}>
              {pending ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
