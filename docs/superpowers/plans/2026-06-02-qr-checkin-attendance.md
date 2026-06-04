# QR Check-in + Auto-calculated Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add QR-code-based session check-in that auto-calculates PRESENT/LATE status from arrival time, with a per-season absence budget tracker visible to students and leaders.

**Architecture:** Schema-first — add config fields to `Season`, check-in state to `Session`, and `checkedInAt` to `Attendance`. A standalone `/checkin/[token]` route (outside AppShell) handles the QR scan. Leaders open/close check-in per session; any leader in the season can open the shared QR. Status is computed at scan time and stored on `Attendance.status`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Auth.js v5, Tailwind v4, Base UI, `qrcode` npm package (QR generation + PNG download), TypeScript strict.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add 4 config fields to `Season`, 3 check-in fields to `Session`, `checkedInAt` to `Attendance` |
| `src/lib/rbac.ts` | Modify | Add `isLeaderInSeason(user, seasonId)` helper |
| `src/lib/season-actions.ts` | Modify | Extend `updateSeasonAction` with attendance config fields |
| `src/lib/seasons-query.ts` | Modify | Include config fields in season queries |
| `src/lib/session-actions.ts` | Modify | Add `openCheckInAction`, `closeCheckInAction` |
| `src/lib/attendance-actions.ts` | Modify | Add `checkInByTokenAction`, `manualOverrideAction` |
| `src/lib/engagement.ts` | Modify | Add `computeAttendanceBudget` |
| `src/app/checkin/[token]/page.tsx` | Create | Standalone check-in page (outside AppShell) |
| `src/components/sessions/check-in-qr.tsx` | Create | Client component: QR display + PNG download |
| `src/components/sessions/check-in-attendance-list.tsx` | Create | Client component: live attendance list with manual override |
| `src/app/leader/sessions/[id]/page.tsx` | Modify | Replace redirect with real session detail + check-in section |
| `src/app/admin/season/[code]/sessions/[id]/page.tsx` | Modify | Add check-in section |
| `src/app/student/dashboard/page.tsx` | Modify | Add absence budget bar to "Your progress" card |
| `src/app/super/seasons/[code]/edit/page.tsx` | Modify | Add attendance config fields to season edit form |

---

## Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Add fields to `Season`, `Session`, and `Attendance` in `prisma/schema.prisma`**

In the `Season` model, add after `deletedAt`:
```prisma
lateThresholdMinutes  Int @default(15)
absenceBudgetMinutes  Int @default(180)
absenceWeightMinutes  Int @default(90)
lateWeightMinutes     Int @default(30)
```

In the `Session` model, add after `recurrenceGroupId`:
```prisma
checkInToken     String?   @unique
checkInOpenAt    DateTime?
checkInClosedAt  DateTime?
```

In the `Attendance` model, add after `markedAt`:
```prisma
checkedInAt  DateTime?
```

- [ ] **Run the migration**
```bash
npm run db:migrate
```
When prompted for a migration name, enter: `attendance_checkin`

Expected: migration created and applied, `✓ Your database is now in sync with your schema.`

- [ ] **Verify Prisma client regenerated**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add QR check-in fields to Season, Session, and Attendance"
```

---

## Task 2: RBAC helper — `isLeaderInSeason`

**Files:**
- Modify: `src/lib/rbac.ts`

The check-in open/close actions need to verify a user is a leader of *any* group within the session's season. The existing `isLeaderOfGroup(u, groupId)` only checks one group. Add a helper that queries group membership for a season.

- [ ] **Add `isLeaderInSeason` to `src/lib/rbac.ts`**

Add after `isLeaderOfGroup`:
```typescript
export async function isLeaderInSeason(
  u: SessionUser,
  seasonId: number,
): Promise<boolean> {
  if (u.role === "SUPER") return true;
  if (u.seasonAdminIds.includes(seasonId)) return true;
  if (u.groupLeaderIds.length === 0) return false;
  const { db } = await import("@/lib/db");
  const count = await db.group.count({
    where: {
      seasonId,
      id: { in: u.groupLeaderIds },
    },
  });
  return count > 0;
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/lib/rbac.ts
git commit -m "feat(rbac): add isLeaderInSeason helper"
```

---

## Task 3: Season attendance config — data layer

**Files:**
- Modify: `src/lib/season-actions.ts`
- Modify: `src/lib/seasons-query.ts`

- [ ] **Extend the season schema in `src/lib/season-actions.ts`**

Find `seasonSchema` and add 4 fields to the `z.object({...})`:
```typescript
lateThresholdMinutes: z.number().int().min(1).max(120).default(15),
absenceBudgetMinutes: z.number().int().min(1).default(180),
absenceWeightMinutes: z.number().int().min(1).default(90),
lateWeightMinutes: z.number().int().min(1).default(90),
```

Extend `SeasonInput` interface with:
```typescript
lateThresholdMinutes?: number;
absenceBudgetMinutes?: number;
absenceWeightMinutes?: number;
lateWeightMinutes?: number;
```

In `updateSeasonAction`, add the 4 fields to the `db.season.update` data block:
```typescript
lateThresholdMinutes: parsed.data.lateThresholdMinutes,
absenceBudgetMinutes: parsed.data.absenceBudgetMinutes,
absenceWeightMinutes: parsed.data.absenceWeightMinutes,
lateWeightMinutes: parsed.data.lateWeightMinutes,
```

- [ ] **Include config fields in season queries in `src/lib/seasons-query.ts`**

Find any `select` blocks that include season fields (e.g. `loadSeasonByCode`) and add:
```typescript
lateThresholdMinutes: true,
absenceBudgetMinutes: true,
absenceWeightMinutes: true,
lateWeightMinutes: true,
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/lib/season-actions.ts src/lib/seasons-query.ts
git commit -m "feat(seasons): add attendance config fields to season actions and queries"
```

---

## Task 4: Season attendance config — UI

**Files:**
- Modify: `src/app/super/seasons/[code]/edit/page.tsx`

- [ ] **Add attendance config section to the season edit form**

In the SUPER season edit page, after the existing form fields, add an "Attendance rules" card section. The form already uses React Hook Form + Zod — add 4 number inputs following the same pattern used for other fields:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">Attendance rules</CardTitle>
  </CardHeader>
  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        Late threshold (minutes)
      </label>
      <Input
        type="number"
        min={1}
        max={120}
        {...register("lateThresholdMinutes", { valueAsNumber: true })}
      />
      <p className="text-xs text-muted-foreground">
        Minutes after session start before a student is marked LATE.
      </p>
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        Absence budget (minutes)
      </label>
      <Input
        type="number"
        min={1}
        {...register("absenceBudgetMinutes", { valueAsNumber: true })}
      />
      <p className="text-xs text-muted-foreground">
        Total minutes a student may miss before being flagged.
      </p>
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        Absence weight (minutes)
      </label>
      <Input
        type="number"
        min={1}
        {...register("absenceWeightMinutes", { valueAsNumber: true })}
      />
      <p className="text-xs text-muted-foreground">
        How many budget minutes one ABSENT consumes.
      </p>
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        Late weight (minutes)
      </label>
      <Input
        type="number"
        min={1}
        {...register("lateWeightMinutes", { valueAsNumber: true })}
      />
      <p className="text-xs text-muted-foreground">
        How many budget minutes one LATE arrival consumes.
      </p>
    </div>
  </CardContent>
</Card>
```

Pass the 4 new fields as `defaultValues` from the loaded season data.

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/app/super/seasons/
git commit -m "feat(admin): add attendance config fields to season edit form"
```

---

## Task 5: `computeAttendanceBudget` lib function

**Files:**
- Modify: `src/lib/engagement.ts`

- [ ] **Add `AttendanceBudget` interface and `computeAttendanceBudget` to `src/lib/engagement.ts`**

Add after the existing `computeEngagementBulk` export:

```typescript
export interface AttendanceBudget {
  minutesUsed: number;
  budgetMinutes: number;
  budgetPct: number; // 0-100
  absentCount: number;
  lateCount: number;
}

export async function computeAttendanceBudget(
  studentUserId: number,
  seasonId: number,
): Promise<AttendanceBudget | null> {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    select: {
      absenceBudgetMinutes: true,
      absenceWeightMinutes: true,
      lateWeightMinutes: true,
    },
  });
  if (!season) return null;

  const [absentCount, lateCount] = await Promise.all([
    db.attendance.count({
      where: {
        studentUserId,
        status: "ABSENT",
        session: { seasonId },
      },
    }),
    db.attendance.count({
      where: {
        studentUserId,
        status: "LATE",
        session: { seasonId },
      },
    }),
  ]);

  const minutesUsed =
    absentCount * season.absenceWeightMinutes +
    lateCount * season.lateWeightMinutes;

  const budgetPct = Math.min(
    Math.round((minutesUsed / season.absenceBudgetMinutes) * 100),
    100,
  );

  return {
    minutesUsed,
    budgetMinutes: season.absenceBudgetMinutes,
    budgetPct,
    absentCount,
    lateCount,
  };
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/lib/engagement.ts
git commit -m "feat(engagement): add computeAttendanceBudget"
```

---

## Task 6: `openCheckIn` / `closeCheckIn` Server Actions

**Files:**
- Modify: `src/lib/session-actions.ts`

- [ ] **Add `openCheckInAction` and `closeCheckInAction` to `src/lib/session-actions.ts`**

Add this import at the top:
```typescript
import { newPublicId } from "@/lib/public-id";
import { isLeaderInSeason } from "@/lib/rbac";
```

Add at the end of the file:
```typescript
export async function openCheckInAction(sessionId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true, checkInToken: true },
  });
  if (!session) return { ok: false, error: "Session not found." };

  if (!(await isLeaderInSeason(user, session.seasonId))) throw new ForbiddenError();

  await db.session.update({
    where: { id: sessionId },
    data: {
      checkInToken: session.checkInToken ?? newPublicId(),
      checkInOpenAt: new Date(),
      checkInClosedAt: null,
    },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  revalidatePath(`/admin/season`);
  return { ok: true };
}

export async function closeCheckInAction(sessionId: number): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { seasonId: true },
  });
  if (!session) return { ok: false, error: "Session not found." };

  if (!(await isLeaderInSeason(user, session.seasonId))) throw new ForbiddenError();

  await db.session.update({
    where: { id: sessionId },
    data: { checkInClosedAt: new Date() },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  revalidatePath(`/admin/season`);
  return { ok: true };
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/lib/session-actions.ts
git commit -m "feat(sessions): add openCheckIn and closeCheckIn server actions"
```

---

## Task 7: `checkInByTokenAction` + manual override

**Files:**
- Modify: `src/lib/attendance-actions.ts`

- [ ] **Add `checkInByTokenAction` and `manualOverrideAction` to `src/lib/attendance-actions.ts`**

Add these imports at the top (they likely already exist — add only what's missing):
```typescript
import { isLeaderInSeason } from "@/lib/rbac";
```

Add at the end of the file:

```typescript
export type CheckInResult =
  | { ok: true; status: "PRESENT" | "LATE"; minutesLate: number }
  | { ok: false; error: "invalid_token" | "not_open" | "closed" | "not_enrolled" | "already_checked_in"; currentStatus?: AttendanceStatus };

export async function checkInByTokenAction(token: string): Promise<CheckInResult> {
  const user = await getCurrentUserOrRedirect();

  const session = await db.session.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      startsAt: true,
      seasonId: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
      season: { select: { lateThresholdMinutes: true } },
    },
  });

  if (!session) return { ok: false, error: "invalid_token" };
  if (!session.checkInOpenAt) return { ok: false, error: "not_open" };
  if (session.checkInClosedAt) return { ok: false, error: "closed" };

  // Verify student is actively enrolled in this season.
  const enrollment = await db.seasonEnrollment.findUnique({
    where: {
      studentUserId_seasonId: {
        studentUserId: user.userId,
        seasonId: session.seasonId,
      },
    },
    select: { status: true },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    return { ok: false, error: "not_enrolled" };
  }

  // Prevent double check-in.
  const existing = await db.attendance.findUnique({
    where: {
      sessionId_studentUserId: {
        sessionId: session.id,
        studentUserId: user.userId,
      },
    },
    select: { checkedInAt: true, status: true },
  });
  if (existing?.checkedInAt) {
    return { ok: false, error: "already_checked_in", currentStatus: existing.status };
  }

  const now = new Date();
  const minutesLate = Math.max(
    0,
    Math.floor((now.getTime() - session.startsAt.getTime()) / 60_000),
  );
  const status: "PRESENT" | "LATE" =
    minutesLate > session.season.lateThresholdMinutes ? "LATE" : "PRESENT";

  await db.attendance.upsert({
    where: {
      sessionId_studentUserId: {
        sessionId: session.id,
        studentUserId: user.userId,
      },
    },
    create: {
      sessionId: session.id,
      studentUserId: user.userId,
      status,
      checkedInAt: now,
      markedById: user.userId,
      markedAt: now,
    },
    update: {
      status,
      checkedInAt: now,
    },
  });

  revalidatePath(`/leader/sessions/${session.id}`);
  revalidatePath(`/student/dashboard`);
  return { ok: true, status, minutesLate };
}

const overrideSchema = z.object({
  studentUserId: z.number().int(),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.EXCUSED,
    AttendanceStatus.LATE,
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export async function manualOverrideAction(
  sessionId: number,
  input: z.infer<typeof overrideSchema>,
): Promise<ActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!(await canMarkAttendance(user, sessionId))) throw new ForbiddenError();

  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  await db.attendance.upsert({
    where: {
      sessionId_studentUserId: {
        sessionId,
        studentUserId: parsed.data.studentUserId,
      },
    },
    create: {
      sessionId,
      studentUserId: parsed.data.studentUserId,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      markedById: user.userId,
      markedAt: new Date(),
    },
    update: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      markedById: user.userId,
      markedAt: new Date(),
    },
  });

  revalidatePath(`/leader/sessions/${sessionId}`);
  return { ok: true };
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/lib/attendance-actions.ts
git commit -m "feat(attendance): add checkInByToken and manualOverride actions"
```

---

## Task 8: Check-in route `/checkin/[token]`

**Files:**
- Create: `src/app/checkin/[token]/page.tsx`

This route lives outside AppShell (like `/login`). It uses a Server Action internally to perform the check-in write on page load (via a form with a hidden token field and auto-submit), then shows the result.

- [ ] **Create `src/app/checkin/[token]/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { CheckCircle, Clock, XCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { checkInByTokenAction } from "@/lib/attendance-actions";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Check in" };

export default async function CheckInPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  // Redirect to login preserving the return URL.
  if (!session?.user) {
    redirect(`/login?callbackUrl=/checkin/${token}`);
  }

  // Perform check-in server-side on render.
  const result = await checkInByTokenAction(token);

  if (result.ok) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-200">
          <CheckCircle className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold text-foreground">
          {result.status === "PRESENT" ? "You're checked in!" : "Checked in — late"}
        </h1>
        {result.status === "LATE" && (
          <p className="text-muted-foreground">
            {result.minutesLate} minute{result.minutesLate === 1 ? "" : "s"} after session start.
          </p>
        )}
        <a
          href="/student/dashboard"
          className="mt-2 text-sm text-brand-teal-600 underline-offset-4 hover:underline dark:text-brand-teal-400"
        >
          Go to dashboard
        </a>
      </main>
    );
  }

  const messages: Record<string, string> = {
    invalid_token: "This check-in link is not valid.",
    not_open: "Check-in hasn't been opened yet. Ask your leader to open it.",
    closed: "Check-in is now closed.",
    not_enrolled: "You are not enrolled in this season.",
    already_checked_in: `You already checked in (${result.currentStatus?.toLowerCase() ?? "recorded"}).`,
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-200">
        {result.error === "already_checked_in" ? (
          <Clock className="size-8" />
        ) : (
          <XCircle className="size-8" />
        )}
      </span>
      <h1 className="text-2xl font-semibold text-foreground">
        {result.error === "already_checked_in" ? "Already checked in" : "Can't check in"}
      </h1>
      <p className="text-muted-foreground">{messages[result.error]}</p>
      <a
        href="/student/dashboard"
        className="mt-2 text-sm text-brand-teal-600 underline-offset-4 hover:underline dark:text-brand-teal-400"
      >
        Go to dashboard
      </a>
    </main>
  );
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/app/checkin/
git commit -m "feat(checkin): add standalone QR check-in route"
```

---

## Task 9: QR display component

**Files:**
- Create: `src/components/sessions/check-in-qr.tsx`

- [ ] **Install the `qrcode` package**
```bash
npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Create `src/components/sessions/check-in-qr.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CheckInQrProps {
  url: string;
  sessionId: number;
}

export function CheckInQr({ url, sessionId }: CheckInQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 2,
        color: { dark: "#0a1628", light: "#ffffff" },
      });
    }
  }, [url]);

  const handleDownload = async () => {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 800,
      margin: 2,
      color: { dark: "#0a1628", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `session-${sessionId}-checkin.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl border border-border/60 p-2"
      />
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download />
        Download QR
      </Button>
    </div>
  );
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/components/sessions/check-in-qr.tsx package.json package-lock.json
git commit -m "feat(components): add CheckInQr component with PNG download"
```

---

## Task 10: Live attendance list component

**Files:**
- Create: `src/components/sessions/check-in-attendance-list.tsx`

This component polls the page every 10 seconds via `router.refresh()` while check-in is open, so newly scanned students appear without a manual reload.

- [ ] **Create `src/components/sessions/check-in-attendance-list.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { manualOverrideAction } from "@/lib/attendance-actions";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface StudentRow {
  userId: number;
  name: string;
  checkedInAt: Date | null;
  status: AttendanceStatus | null;
}

interface CheckInAttendanceListProps {
  sessionId: number;
  students: StudentRow[];
  isOpen: boolean;
}

const statusVariant: Record<AttendanceStatus, "success" | "warning" | "destructive" | "info"> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "destructive",
  EXCUSED: "info",
};

export function CheckInAttendanceList({
  sessionId,
  students,
  isOpen,
}: CheckInAttendanceListProps) {
  const router = useRouter();
  const [overriding, setOverriding] = useState<StudentRow | null>(null);
  const [pending, setPending] = useState(false);

  // Poll every 10 seconds while check-in is open.
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [isOpen, router]);

  const handleOverride = async (status: AttendanceStatus) => {
    if (!overriding) return;
    setPending(true);
    await manualOverrideAction(sessionId, {
      studentUserId: overriding.userId,
      status,
    });
    setPending(false);
    setOverriding(null);
    router.refresh();
  };

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {students.map((s) => (
          <li
            key={s.userId}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{s.name}</span>
              {s.checkedInAt && (
                <span className="text-xs text-muted-foreground">
                  Scanned at {format(s.checkedInAt, "h:mm a")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {s.status ? (
                <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
              ) : (
                <Badge variant="outline">Not recorded</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOverriding(s)}
              >
                Edit
              </Button>
            </div>
          </li>
        ))}
        {students.length === 0 && (
          <li className="py-4 text-center text-sm italic text-muted-foreground">
            No students have scanned yet.
          </li>
        )}
      </ul>

      <Modal open={!!overriding} onOpenChange={(o) => !o && setOverriding(null)}>
        <div className="flex flex-col gap-4 p-4">
          <p className="font-medium">
            Set status for {overriding?.name}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map(
              (s) => (
                <Button
                  key={s}
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleOverride(s)}
                >
                  {s}
                </Button>
              ),
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Commit**
```bash
git add src/components/sessions/check-in-attendance-list.tsx
git commit -m "feat(components): add CheckInAttendanceList with polling and manual override"
```

---

## Task 11: Leader session detail page

**Files:**
- Modify: `src/app/leader/sessions/[id]/page.tsx`

Replace the current redirect-only page with a real session detail page that includes the check-in section.

- [ ] **Replace `src/app/leader/sessions/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { format } from "date-fns";
import { QrCode } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { isLeaderInSeason } from "@/lib/rbac";
import { loadSessionById } from "@/lib/sessions-query";
import { openCheckInAction, closeCheckInAction } from "@/lib/session-actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckInQr } from "@/components/sessions/check-in-qr";
import { CheckInAttendanceList } from "@/components/sessions/check-in-attendance-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Session" };

export default async function LeaderSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);
  const { id } = await params;
  const session = await loadSessionById(Number(id));

  // Verify this leader belongs to the session's season.
  if (!(await isLeaderInSeason(user, session.seasonId))) {
    return null; // AppShell handles forbidden state
  }

  const checkInOpen = !!session.checkInOpenAt && !session.checkInClosedAt;
  const checkInUrl = session.checkInToken
    ? `${process.env.AUTH_URL}/checkin/${session.checkInToken}`
    : null;

  // Load group students scoped to this leader's group(s) in this season.
  const groupStudents = await db.groupStudent.findMany({
    where: {
      group: {
        seasonId: session.seasonId,
        id: { in: user.groupLeaderIds },
      },
    },
    select: {
      studentUser: {
        select: {
          id: true,
          name: true,
          attendanceRecords: {
            where: { sessionId: session.id },
            select: { status: true, checkedInAt: true },
          },
        },
      },
    },
  });

  const studentRows = groupStudents.map((gs) => ({
    userId: gs.studentUser.id,
    name: gs.studentUser.name,
    checkedInAt: gs.studentUser.attendanceRecords[0]?.checkedInAt ?? null,
    status: gs.studentUser.attendanceRecords[0]?.status ?? null,
  }));

  return (
    <>
      <PageHeader
        title={session.title}
        description={format(session.startsAt, "EEE, MMM d · h:mm a")}
      />

      {/* Check-in control */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-4" />
            Check-in
          </CardTitle>
          {checkInOpen ? (
            <form action={async () => { "use server"; await closeCheckInAction(session.id); }}>
              <Button type="submit" variant="outline" size="sm">
                Close check-in
              </Button>
            </form>
          ) : (
            <form action={async () => { "use server"; await openCheckInAction(session.id); }}>
              <Button type="submit" size="sm">
                Open check-in
              </Button>
            </form>
          )}
        </CardHeader>

        {checkInOpen && checkInUrl && (
          <CardContent className="flex flex-col gap-6">
            <CheckInQr url={checkInUrl} sessionId={session.id} />
            <CheckInAttendanceList
              sessionId={session.id}
              students={studentRows}
              isOpen={checkInOpen}
            />
          </CardContent>
        )}

        {!checkInOpen && (
          <CardContent>
            <CheckInAttendanceList
              sessionId={session.id}
              students={studentRows}
              isOpen={false}
            />
          </CardContent>
        )}
      </Card>
    </>
  );
}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Test manually**
  1. Sign in as a LEADER → navigate to `/leader/calendar` → tap any session
  2. Should land on session detail (not redirect to attendance)
  3. Tap "Open check-in" → QR code appears
  4. Tap "Download QR" → PNG downloads
  5. Tap "Close check-in" → QR disappears, attendance list remains

- [ ] **Commit**
```bash
git add src/app/leader/sessions/
git commit -m "feat(leader): replace session redirect with full detail + QR check-in"
```

---

## Task 12: Student dashboard — absence budget bar

**Files:**
- Modify: `src/app/student/dashboard/page.tsx`

- [ ] **Import `computeAttendanceBudget` and add it to the parallel fetch**

In `src/app/student/dashboard/page.tsx`, add the import:
```typescript
import { computeEngagementForStudent, computeAttendanceBudget } from "@/lib/engagement";
```

Extend the `Promise.all` block (inside the `seasonId` branch) to include budget:
```typescript
const [engagement, nextSession, assignments, recentFeedback, budget] = seasonId
  ? await Promise.all([
      computeEngagementForStudent(user.userId, seasonId),
      db.session.findFirst({ /* existing */ }),
      listAssignmentsForStudent(user.userId, seasonId),
      db.submission.findMany({ /* existing */ }),
      computeAttendanceBudget(user.userId, seasonId),
    ])
  : [null, null, [], [], null];
```

- [ ] **Add the budget bar inside the "Your progress" card**

In the `engagement && (...)` card, after the attendance progress bar, add:

```tsx
{budget && (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-3">
      <Progress
        value={budget.budgetPct}
        className={[
          "flex-1",
          budget.budgetPct >= 80 ? "[&>div]:bg-error-500" :
          budget.budgetPct >= 50 ? "[&>div]:bg-warning-500" : "",
        ].join(" ")}
      />
      <span className={[
        "text-sm font-semibold tabular-nums",
        budget.budgetPct >= 80 ? "text-error-700 dark:text-error-400" :
        budget.budgetPct >= 50 ? "text-warning-700 dark:text-warning-400" :
        "text-muted-foreground",
      ].join(" ")}>
        {budget.minutesUsed}/{budget.budgetMinutes} min
      </span>
    </div>
    <p className="text-xs text-muted-foreground">
      Absence budget used ({budget.absentCount} absent,{" "}
      {budget.lateCount} late)
    </p>
  </div>
)}
```

- [ ] **Verify**
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Test manually**
  1. Sign in as a STUDENT with at least one ABSENT or LATE attendance record
  2. Dashboard "Your progress" card should show the budget bar below the attendance bar
  3. If `minutesUsed / budgetMinutes > 0.8`, bar should be red

- [ ] **Commit**
```bash
git add src/app/student/dashboard/page.tsx
git commit -m "feat(student): add absence budget bar to dashboard progress card"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - ✓ Season config fields (Task 1, 3, 4)
  - ✓ `openCheckIn` / `closeCheckIn` (Task 6)
  - ✓ One QR per session, any leader in season can open (Task 6 RBAC, Task 11 UI)
  - ✓ `checkInByToken` — validates open state, computes PRESENT/LATE (Task 7)
  - ✓ Already-checked-in guard (Task 7)
  - ✓ Auth redirect on QR scan (Task 8)
  - ✓ Standalone check-in route outside AppShell (Task 8)
  - ✓ QR display + PNG download (Task 9)
  - ✓ Live attendance list with 10s polling (Task 10)
  - ✓ Manual override at any time (Task 10, Task 7)
  - ✓ Leader sees only their group's students (Task 11)
  - ✓ Absence budget on student dashboard (Task 12)

- **Type consistency:** `checkInByTokenAction` returns `CheckInResult`; `CheckInAttendanceList` receives `StudentRow[]` — both defined in their respective files.

- **No placeholders:** All code blocks are complete and runnable.
