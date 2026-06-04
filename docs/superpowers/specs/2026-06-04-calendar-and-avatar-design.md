# Calendar Grid + JPC Events + Member Avatar — Design Spec

_Date: 2026-06-04_

---

## Context

Three UX improvements requested for JPC Space:

1. **Calendar views** currently render as a plain list. Replace them with a real month-grid `SeasonCalendar` so members can see sessions in weekly context.
2. **JPC general calendar** — Super admin publishes organisation-wide events (retreats, outreach, etc.) visible to all members on the same calendar grid; some events are alumni-only (visible to LEADER, ADMIN, MENTOR, SUPER but not STUDENT).
3. **Member display pictures** — students upload a profile photo that shows in rosters.

---

## Feature 1 — SeasonCalendar Month Grid

### Component: `SeasonCalendar`

New file: `src/components/sessions/season-calendar.tsx` — `"use client"` (needs month navigation state).

**Props:**
```ts
interface SeasonCalendarProps {
  sessions: SessionListRow[]
  jpcEvents: JpcEventRow[]
  getSessionHref: (id: number) => string
  seasonColors?: Record<number, string>   // super admin only: seasonId → color
}
```

**Grid:** 7-column CSS grid, Monday first (Mon Tue Wed Thu Fri Sat Sun). All 7 columns can carry JPC event chips; only Monday cells carry session cells.

**Session cell (Monday column only):**
- Upcoming: navy fill (`brand-navy-800` bg, `brand-teal-400` text)
- Today: green fill (`success-800` bg, `success-300` text) + "Today" label
- Past: muted grey (`neutral-700` bg, `neutral-400` text)
- Full cell is a `<Link>` → `getSessionHref(id)`; title truncated with `overflow-hidden text-ellipsis`

**JPC event chip (any column):**
- Small rounded chip below the date number
- `ALL` events: teal accent chip
- `ALUMNI_ONLY` events: amber chip with a lock icon — only rendered if user role ≠ STUDENT
- Chip is a `<Link href={event.url}>` if `url` is set, otherwise plain `<span>`

**Month navigation header:** "← September 2026 →" with prev/next buttons. Defaults to current month on first render.

**Empty state:** `EmptyState` component when no sessions and no events exist at all.

### What it replaces

`CalendarList` is kept in the codebase but no longer used by calendar pages. All pages below swap to `SeasonCalendar`.

### Pages updated

| Page | `getSessionHref` target |
|---|---|
| `src/app/student/calendar/page.tsx` | `/student/sessions/[id]` |
| `src/app/leader/calendar/page.tsx` | `/leader/sessions/[id]` |
| `src/app/admin/season/[code]/calendar/page.tsx` | `/admin/season/[code]/sessions/[id]` |
| `src/app/super/calendar/page.tsx` (new) | `/admin/season/[code]/sessions/[id]` |

Each page fetches JPC events from a shared query function (see Feature 2) and passes them down. Student pages pass only `ALL` events; leader/admin/super pages pass both `ALL` and `ALUMNI_ONLY` events.

### Super Admin Global Calendar

New page: `src/app/super/calendar/page.tsx`

- Fetches sessions across **all active seasons** via new query in `src/lib/sessions-query.ts`
- `seasonColors` is a palette map (cycle through 5–6 brand-safe token pairs per season)
- Season legend above the grid: each season `code` + color swatch
- Navigation entry added to super nav in `src/lib/navigation.ts`

---

## Feature 2 — JPC General Calendar Events

### Data model

New Prisma model (requires migration):

```prisma
model JpcEvent {
  id          Int             @id @default(autoincrement())
  title       String
  date        DateTime
  url         String?
  visibility  JpcVisibility   @default(ALL)
  createdById Int
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  createdBy   User            @relation(fields: [createdById], references: [id])
}

enum JpcVisibility {
  ALL
  ALUMNI_ONLY
}
```

### Query layer

`src/lib/jpc-events-query.ts` (new):
- `getJpcEvents({ includeAlumniOnly: boolean }): Promise<JpcEventRow[]>` — returns upcoming + recent events, filtered by visibility
- `JpcEventRow` type: `{ id, title, date, url, visibility }`

### Super admin management UI

New page: `src/app/super/events/page.tsx`

- Lists all JPC events (past + upcoming) in a simple table
- "New event" button → inline form or modal using existing `Modal` + `Input`/`DatePicker` components
- Fields: Title (required), Date (required), Link/URL (optional), Visibility (ALL | Alumni only)
- Server Actions in `src/lib/jpc-event-actions.ts`: `createJpcEvent`, `updateJpcEvent`, `deleteJpcEvent` — all gated to `canManageUsers(user)` (SUPER only)
- Navigation entry added to super nav in `src/lib/navigation.ts`

### Access control

- SUPER creates/edits/deletes JPC events
- All logged-in users can read `ALL` events
- `ALUMNI_ONLY` events visible to LEADER, ADMIN, MENTOR, SUPER — not STUDENT
- Enforced at the query layer in `getJpcEvents` and verified in Server Actions

---

## Feature 3 — Member Profile Picture / Avatar

### Schema

No migration needed. `User.avatarPath String?` already exists in `prisma/schema.prisma`.

### Upload — Student Profile Page

`src/app/student/profile/page.tsx` + `StudentForm` component:

- Avatar upload section above the form: circular `Avatar` (xl), "Upload photo" button
- `<input type="file" accept="image/jpeg,image/png,image/webp">` with client-side 5 MB size check
- On select: calls `updateAvatarAction(formData)` Server Action in `src/lib/user-actions.ts`
  - Stores file via `storage.put(key, buffer, { mimeType, size })`; key: `avatars/{userId}.{ext}`
  - Writes path to `User.avatarPath` via `db.user.update`

### File Serving

New route: `src/app/api/uploads/[...path]/route.ts`

- GET: reads path, calls `storage.get(path)`, streams with correct `Content-Type`
- Requires authenticated session; returns 401 otherwise
- Serves all upload types (avatars, submission files)

`LocalFsStorage.url(path)` updated to return `/api/uploads/${path}`.

### Display

Wire `User.avatarPath` → `AvatarImage src` in:
1. `src/components/users/users-list.tsx` — used by super students list
2. `src/app/admin/season/[code]/groups/[id]/page.tsx` — group member roster

`avatarUrl` is computed server-side via `storage.url(user.avatarPath)` and passed as a prop. Falls back to initials if null.

---

## Out of Scope

- Navbar avatar display (deferred)
- Attendance list avatars (deferred)
- Admin uploading photos on behalf of students (deferred)
- Image cropping / resizing (deferred)
- S3 driver implementation (stub stays)
- JPC events on leader/admin own dashboard (deferred — calendar page covers it)

---

## Verification

1. `npm run typecheck` and `npm run build` pass
2. Student calendar shows month grid; session Mondays are filled cells; JPC `ALL` events appear as teal chips on their day
3. Leader/admin calendar also shows amber `ALUMNI_ONLY` chips; student calendar does not
4. Clicking a session cell navigates to the correct role session detail page
5. Prev/next month navigation works
6. Super admin `/super/calendar` shows sessions from all seasons with color coding
7. Super admin can create/edit/delete JPC events at `/super/events`; alumni-only toggle works
8. Student uploads photo on `/student/profile`; preview updates immediately
9. Uploaded photo appears in student roster on `/super/students` and group member pages
10. Fallback initials appear for students with no photo
