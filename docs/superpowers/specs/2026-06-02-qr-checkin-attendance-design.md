# QR Check-in + Auto-calculated Attendance — Design Spec

**Date:** 2026-06-02
**Sprint:** 1 (revised — pulled forward from Sprint 3)
**Status:** Approved

---

## Context

The current attendance system requires leaders to manually set each student's status (PRESENT / LATE / ABSENT / EXCUSED) after every session. This is error-prone and places the full burden on the leader.

This sprint introduces QR-code-based check-in: a unique QR code is displayed at the venue, students scan it on arrival, and the system automatically records a check-in timestamp and computes their status (PRESENT or LATE) based on configurable per-season thresholds. Leaders retain the ability to manually override any status at any time. An absence budget tracks how many minutes each student has consumed across the season.

---

## Schema Changes

### `Season` — 4 new attendance config fields

```prisma
lateThresholdMinutes  Int @default(15)   // mins after session start → LATE
absenceBudgetMinutes  Int @default(180)  // total mins a student may miss per season
absenceWeightMinutes  Int @default(90)   // mins an ABSENT counts toward budget
lateWeightMinutes     Int @default(30)   // mins a LATE counts toward budget
```

All fields have sensible defaults so existing seasons require no manual configuration.

### `Session` — check-in state

```prisma
checkInToken     String    @unique  // nanoid generated at session creation
checkInOpenAt    DateTime?           // set when leader opens check-in
checkInClosedAt  DateTime?           // set when leader closes check-in
```

`checkInToken` is generated via the existing `newPublicId()` helper at session creation time and never changes. It is the sole key used to validate QR scans.

### `Attendance` — check-in timestamp

```prisma
checkedInAt  DateTime?  // recorded at QR scan time
```

`Attendance.status` continues to be the authoritative status field. On a successful QR scan the system writes both `checkedInAt = now()` and computes `status`:

```
checkedInAt - session.startsAt > season.lateThresholdMinutes
  → status = LATE
  else
  → status = PRESENT
```

Leaders may override `status` manually at any time regardless of whether `checkedInAt` is set.

---

## Features

### 1. Season attendance config UI

**Location:** Admin season settings page — new "Attendance rules" card.

**Fields (number inputs, all required):**
- Late threshold (minutes)
- Absence budget (minutes)
- Absence weight per session missed (minutes)
- Late weight per late arrival (minutes)

Pre-filled with defaults on new seasons. Saved via existing season update Server Action (extend it with the 4 new fields).

---

### 2. Leader — session check-in screen

**One QR per session, shared across all groups in the season.** A session belongs to a season and is attended by all groups. Any leader of any group in that season (plus admins and SUPER) can open check-in. All leaders display the same QR code. When a student scans, their group is resolved automatically via `GroupStudent`.

**Location:** Leader session detail page (`/leader/sessions/[id]`). New "Check-in" section below session info.

**States:**

| State | UI |
|---|---|
| Check-in closed | "Open Check-in" button |
| Check-in open | Full-screen QR code + "Download QR" button + "Close Check-in" button |
| Check-in closed (after session) | Summary: X present, Y late, Z absent |

**QR code content:** A URL — `[AUTH_URL]/checkin/[checkInToken]` where `AUTH_URL` is the `AUTH_URL` env var (already required by Auth.js, set correctly for both localhost and Codespaces).

**Download:** Exports the QR as a PNG using a canvas element, filename `session-[id]-checkin.png`.

**Live attendance list:** Rendered below the QR while check-in is open. Each leader sees only the students in their own group (scoped by `GroupStudent`). Students appear as they scan. Each row shows name, check-in time, computed status badge. Leader can tap any row to manually set status via a bottom sheet with 4 options (PRESENT / LATE / ABSENT / EXCUSED).

**Server Actions (new):**
- `openCheckIn(sessionId)` — sets `checkInOpenAt = now()`, clears `checkInClosedAt`. Any authorised leader of the season may call this.
- `closeCheckIn(sessionId)` — sets `checkInClosedAt = now()`. Any authorised leader of the season may call this.

---

### 3. Check-in route (`/checkin/[token]`)

A standalone route outside the role-based layouts (no AppShell). Accessible immediately after scanning without being logged in — but completing check-in requires authentication.

**Flow:**

```
Student scans QR
  → browser opens /checkin/[token]
  → if not authenticated → redirect to /login?callbackUrl=/checkin/[token]
  → after login → return to /checkin/[token]
  → server validates token:
      - session exists with this token
      - checkInOpenAt is set
      - checkInClosedAt is null
  → if valid:
      - upsert Attendance: checkedInAt = now(), compute + set status
      - render success screen
  → if invalid:
      - render error screen with reason
```

**Success screen:** Shows session title, computed status (PRESENT / LATE), and minutes late if applicable. Links back to `/student/dashboard`.

**Error states:**
- Check-in not open yet
- Check-in has been closed
- Invalid token
- Already checked in (show current status, no duplicate write)

**New API route:** `src/app/checkin/[token]/page.tsx` (Server Component with Server Action for the write).

---

### 4. Absence budget tracking

**Computation:**
```
budgetUsed = (ABSENT count × absenceWeightMinutes) + (LATE count × lateWeightMinutes)
budgetRemaining = absenceBudgetMinutes - budgetUsed
```

**Displayed:**
- **Student dashboard** — progress bar in the "Your progress" card alongside attendance %. Turns `warning` colour when `budgetUsed > 50%`, `error` when `budgetUsed > 80%`.
- **Student session detail page** (Sprint 2) — shown below the attendance status card.
- **Leader student detail page** — shown in the student's engagement summary.

**Library function:** `computeAttendanceBudget(studentUserId, seasonId)` in `src/lib/engagement.ts` (alongside the existing `computeEngagementForStudent`).

---

## Access Control

| Action | Who |
|---|---|
| Open / close check-in | Any LEADER of any group in the session's season, ADMIN of season, SUPER |
| QR scan / check-in write | STUDENT (authenticated, enrolled in the season) |
| Manual attendance override | LEADER of the group, ADMIN of season, SUPER |
| View absence budget | STUDENT (own only), LEADER of group, MENTOR, ADMIN, SUPER |
| Edit season attendance config | ADMIN of season, SUPER |

---

## Files Touched

### New files
- `src/app/checkin/[token]/page.tsx` — standalone check-in page + Server Action
- `src/components/sessions/check-in-qr.tsx` — QR display + download (client component)
- `src/components/sessions/check-in-attendance-list.tsx` — live attendance list (client, polls or uses optimistic updates)

### Modified files
- `prisma/schema.prisma` — 4 fields on `Season`, 2 fields on `Session`, 1 field on `Attendance`
- `src/lib/session-actions.ts` — add `openCheckIn`, `closeCheckIn` Server Actions
- `src/lib/attendance-actions.ts` — add `checkInByToken`, `manualOverride` Server Actions
- `src/lib/engagement.ts` — add `computeAttendanceBudget`
- `src/app/leader/sessions/[id]/page.tsx` — add check-in section
- `src/app/admin/season/[code]/sessions/[id]/page.tsx` — add check-in section
- `src/app/student/dashboard/page.tsx` — add budget progress bar to "Your progress" card
- `src/components/settings/settings-form.tsx` or season edit form — add attendance config fields
- `prisma/migrations/` — new migration

---

## Verification

1. **Schema:** `npm run db:migrate` applies cleanly with no data loss on existing rows (all new fields have defaults or are nullable).
2. **Leader flow:** Open a session as a leader → QR code appears → download PNG → close check-in.
3. **Student flow:** Scan QR (or navigate directly to `/checkin/[token]`) → check in → success screen shows correct PRESENT/LATE status based on time elapsed since `session.startsAt`.
4. **Late calculation:** Set `lateThresholdMinutes = 1` on a season, wait 2 minutes after session start, scan → status should be LATE.
5. **Manual override:** After QR check-in, leader overrides status → status updates, `checkedInAt` preserved.
6. **Budget bar:** ABSENT a student for 2 sessions with `absenceWeightMinutes = 90`, `absenceBudgetMinutes = 180` → dashboard shows 100% budget used, error colour.
7. **Auth redirect:** Visit `/checkin/[token]` while logged out → redirected to login → after login → returned to check-in → completes successfully.
8. **`npm run typecheck`** passes with zero errors.
