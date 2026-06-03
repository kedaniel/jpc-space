# Student QR Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a student session detail page with a built-in QR scanner so students can check in from within the app without leaving to the camera.

**Architecture:** A new Server Component page (`/student/sessions/[id]`) fetches session data and passes `isCheckInOpen` to `StudentCheckinButton` (client component). The button opens a Modal containing `QrScannerView`, which is dynamically imported (`ssr: false`) so the `qr-scanner` WASM bundle only loads when the modal opens. On a valid scan the student is pushed to `/checkin/[token]`, which handles the actual check-in.

**Tech Stack:** `qr-scanner` v1.4+ (WebAssembly QR detection), `next/dynamic` (lazy WASM load), Next.js App Router Server Components, existing Modal + Button + Card primitives.

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/app/student/sessions/[id]/page.tsx` | Server Component — auth, enrollment guard, `isCheckInOpen`, session card |
| Create | `src/components/sessions/qr-scanner-view.tsx` | `"use client"` — live camera feed via `qr-scanner` |
| Create | `src/components/sessions/student-checkin-button.tsx` | `"use client"` — button states + modal, dynamically imports `QrScannerView` |
| Modify | `public/` | Copy `qr-scanner-worker.min.js` here so the WASM worker is served statically |

---

## Task 1: Install `qr-scanner` and place the worker

**Files:**
- Modify: `package.json` (via npm)
- Create: `public/qr-scanner-worker.min.js`

- [ ] **Step 1: Install the package**

```bash
npm install qr-scanner
npm install --save-dev @types/qr-scanner 2>/dev/null; true
```

- [ ] **Step 2: Copy the WASM worker to public**

```bash
cp node_modules/qr-scanner/qr-scanner-worker.min.js public/
```

- [ ] **Step 3: Verify the file exists**

```bash
ls -lh public/qr-scanner-worker.min.js
```
Expected: file present, roughly 100–200 KB.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/qr-scanner-worker.min.js
git commit -m "chore: add qr-scanner dependency and worker"
```

---

## Task 2: Build `QrScannerView`

**Files:**
- Create: `src/components/sessions/qr-scanner-view.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/sessions/qr-scanner-view.tsx
"use client";

import { useEffect, useRef } from "react";
import QrScanner from "qr-scanner";

interface QrScannerViewProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScannerView({ onScan, active }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Stable ref so the effect doesn't restart when onScan identity changes
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!videoRef.current || !active) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => onScanRef.current(result.data),
      {
        workerPath: "/qr-scanner-worker.min.js",
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    scanner.start();

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [active]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/qr-scanner-view.tsx
git commit -m "feat(checkin): add QrScannerView camera component"
```

---

## Task 3: Build `StudentCheckinButton`

**Files:**
- Create: `src/components/sessions/student-checkin-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/sessions/student-checkin-button.tsx
"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";

const QrScannerView = dynamic(
  () =>
    import("@/components/sessions/qr-scanner-view").then((m) => ({
      default: m.QrScannerView,
    })),
  { ssr: false },
);

interface StudentCheckinButtonProps {
  isCheckInOpen: boolean;
}

function extractCheckinPath(raw: string): string | null {
  try {
    const { pathname } = new URL(raw);
    const match = pathname.match(/^\/checkin\/([A-Za-z0-9_-]+)$/);
    return match ? `/checkin/${match[1]}` : null;
  } catch {
    return null;
  }
}

export function StudentCheckinButton({ isCheckInOpen }: StudentCheckinButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  function openModal() {
    setError(null);
    handled.current = false;
    setOpen(true);
  }

  function handleScan(data: string) {
    if (handled.current) return;
    const path = extractCheckinPath(data);
    if (path) {
      handled.current = true;
      setOpen(false);
      router.push(path);
    } else {
      setError("That doesn't look like a check-in code");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button disabled={!isCheckInOpen} onClick={openModal} className="w-full sm:w-auto">
        <QrCode className="size-4" />
        Check In
      </Button>
      {!isCheckInOpen && (
        <p className="text-xs text-muted-foreground">Check-in hasn&apos;t opened yet</p>
      )}

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Scan the QR code</ModalTitle>
            <ModalDescription>
              Point your camera at the QR code displayed by your leader.
            </ModalDescription>
          </ModalHeader>
          <QrScannerView onScan={handleScan} active={open} />
          {error && (
            <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/student-checkin-button.tsx
git commit -m "feat(checkin): add StudentCheckinButton with QR scanner modal"
```

---

## Task 4: Build the student session detail page

**Files:**
- Create: `src/app/student/sessions/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/student/sessions/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { loadSessionById } from "@/lib/sessions-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentCheckinButton } from "@/components/sessions/student-checkin-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Session #${id}` };
}

const CHECK_IN_DURATION_MS = 3 * 60 * 60 * 1000;

export default async function StudentSessionPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const { id } = await params;
  const session = await loadSessionById(Number(id));

  const enrollment = await db.seasonEnrollment.findFirst({
    where: {
      studentUserId: user.userId,
      seasonId: session.seasonId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!enrollment) notFound();

  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() runs once per request
  const now = Date.now();
  const isCheckInOpen =
    !!session.checkInOpenAt &&
    !session.checkInClosedAt &&
    now - session.checkInOpenAt.getTime() < CHECK_IN_DURATION_MS;

  return (
    <>
      <PageHeader
        title={session.title}
        description={`${session.seasonTitle} · ${format(session.startsAt, "EEE, MMM d · h:mm a")}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>{session.durationMinutes} minutes</p>
            {session.location && (
              <p className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {session.location}
              </p>
            )}
          </div>
          <StudentCheckinButton isCheckInOpen={isCheckInOpen} />
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```
Expected: no new errors.

- [ ] **Step 3: Lint**

```bash
npm run lint 2>&1 | grep -E "error" | grep -v "theme-provider\|theme-toggle"
```
Expected: no errors from new files.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -15
```
Expected: build completes, `/student/sessions/[id]` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add src/app/student/sessions/
git commit -m "feat(student): add session detail page with QR check-in"
```

---

## Task 5: Fix the missing `key` prop warning

**Files:**
- Investigate: `src/components/sessions/calendar-list.tsx` and other recently changed list renders

The React warning "Each child in a list should have a unique key prop" in `OuterLayoutRouter` is typically triggered by a list rendered without `key` props in a layout or page component. The most likely cause is in our recently modified components.

- [ ] **Step 1: Search for lists without keys in recently changed files**

```bash
grep -n "\.map(" \
  src/components/sessions/calendar-list.tsx \
  src/components/sessions/session-checkin-controls.tsx \
  src/components/seasons/season-detail.tsx \
  src/app/admin/season/\[code\]/page.tsx \
  src/app/student/dashboard/page.tsx \
  2>/dev/null
```

- [ ] **Step 2: Run the dev server and check the browser console**

```bash
npm run dev
```

Open `http://localhost:3000`, sign in as a student, navigate to `/student/dashboard` and `/student/calendar`. Check the browser console for the exact component stack in the key warning. That will identify which file to fix.

- [ ] **Step 3: Add missing `key` props to the offending `.map()` call**

Once identified, add `key={<unique-id>}` to the direct child of the `.map()`. Use the item's `id` field (e.g. `key={s.id}`, `key={a.id}`).

- [ ] **Step 4: Confirm warning is gone**

Reload the page. The "unique key prop" warning should no longer appear in the console.

- [ ] **Step 5: Commit**

```bash
git add <changed files>
git commit -m "fix: add missing key props to list renders"
```

---

## Verification

1. Sign in as a student enrolled in an active season.
2. Go to **Calendar** → tap any session → confirm you land on `/student/sessions/<id>` with the session card and "Check In" button.
3. **When check-in is not open:** button is disabled, caption "Check-in hasn't opened yet" is visible.
4. **When check-in is open (open it as admin first):** button is active → tap → camera opens → point at the admin QR code → app navigates to `/checkin/<token>` → success screen.
5. **Wrong QR code:** scan something unrelated → inline error "That doesn't look like a check-in code" appears, modal stays open.
6. **Not enrolled:** visit a session from a different season → `notFound()` (404 page).
