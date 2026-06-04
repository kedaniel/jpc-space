# Student QR Check-In — Design Spec

**Date:** 2026-06-03

## Context

Students currently check in by physically scanning a QR code that opens `/checkin/[token]` in their browser. There is no in-app entry point for this flow — the student must scan with their phone camera from outside the app. This spec adds a student session detail page with a built-in QR scanner so the student can check in from within the app.

## Scope

- New page: `src/app/student/sessions/[id]/page.tsx`
- New client component: `src/components/sessions/student-checkin-button.tsx`
- New npm dependency: `qr-scanner`
- The existing `/checkin/[token]` page handles the actual check-in and all success/error states — this feature only adds the scanner entry point.

## Page: Student Session Detail

**Route:** `/student/sessions/[id]`

**Access control:**
- `requireRole(user, ["STUDENT"])`
- Query `db.seasonEnrollment` to confirm the student is enrolled in the session's season; return `notFound()` if not

**Data fetched (Server Component):**
- `loadSessionById(id)` — title, startsAt, durationMinutes, location, checkInOpenAt, checkInClosedAt
- `db.seasonEnrollment` check (enrollment guard)
- `isCheckInOpen` computed from `checkInOpenAt` / `checkInClosedAt` / `Date.now()` using the 3-hour window (same logic as admin/leader pages, with `eslint-disable-next-line react-hooks/purity` comment)

**UI:**
- Session card: title, formatted date/time, duration, location (if set)
- `StudentCheckinButton` receiving `isCheckInOpen`

## Component: StudentCheckinButton

**File:** `src/components/sessions/student-checkin-button.tsx`  
**Type:** `"use client"`

### Button states

| State | Condition | Appearance |
|---|---|---|
| Active | `isCheckInOpen === true` | Primary "Check In" button, opens scanner modal |
| Disabled | `isCheckInOpen === false` | Greyed "Check In" button + caption "Check-in hasn't opened yet" |

### Scanner modal

- Opens on button press (active state only)
- Contains a live camera feed powered by `qr-scanner`
- `QrScanner` is **dynamically imported** (`next/dynamic`, `ssr: false`) so the WASM bundle loads only when the modal first opens
- On successful scan:
  - If the decoded URL matches `/checkin/<token>` from this app → `router.push("/checkin/<token>")`
  - Otherwise → show inline error "That doesn't look like a check-in code" without closing the modal
- Close button always available

## Dependencies

| Package | Purpose |
|---|---|
| `qr-scanner` | Live camera QR scanning (WebAssembly-based, ~50KB) |

Install: `npm install qr-scanner`

## Verification

1. Navigate to student calendar → tap a session → session detail page renders
2. When check-in is not open: button is disabled, caption visible
3. When check-in is open: button active → tap → camera opens → point at QR → auto-navigates to `/checkin/[token]` → success screen
4. Scanning an unrelated QR code shows inline error, modal stays open
5. Student not enrolled in the season → `notFound()`
6. `npm run typecheck` and `npm run lint` pass
