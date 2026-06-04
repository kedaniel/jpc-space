# SeasonCalendar + JPC Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the list-based CalendarList with a month-grid SeasonCalendar component across all roles, and add a JPC general events system managed by super admins with ALL/ALUMNI_ONLY visibility.

**Architecture:** SeasonCalendar is a `"use client"` component rendering a 7-column Monday-first grid from pre-fetched `SessionListRow[]` + `JpcEventRow[]` data. Session Mondays are filled colored cells; JPC events are chips on any column. JpcEvent is a new Prisma model; super admins manage it at `/super/events`. The same component is used by all four role calendar pages plus a new `/super/calendar` global view.

**Tech Stack:** Next.js 16 App Router, Prisma 7, React 19, Server Actions, date-fns, Tailwind v4, Base UI, Lucide icons, Zod.

> **No test runner yet** — use `npm run typecheck` and `npm run lint` as gating checks after each task. Fix all errors before committing.

---

## File Map

**Create:**
- `src/lib/jpc-events-query.ts` — query layer for JpcEvent
- `src/lib/jpc-event-actions.ts` — Server Actions: create/update/delete JpcEvent
- `src/components/sessions/season-calendar.tsx` — month-grid calendar component
- `src/app/super/events/page.tsx` — super admin JPC events management page
- `src/app/super/events/jpc-event-form.tsx` — create/edit form (client component)
- `src/app/super/calendar/page.tsx` — super admin global calendar page

**Modify:**
- `prisma/schema.prisma` — add JpcEvent model + JpcVisibility enum
- `src/lib/sessions-query.ts` — add `seasonId` to SessionListRow + new `listSessionsForAllActiveSeasons`
- `src/lib/navigation.ts` — add calendar + events entries to super nav; add NavIconName "events"
- `src/components/layout/nav-link.tsx` — add "events" to iconMap
- `src/app/student/calendar/page.tsx` — swap CalendarList → SeasonCalendar
- `src/app/leader/calendar/page.tsx` — swap CalendarList → SeasonCalendar
- `src/app/admin/season/[code]/calendar/page.tsx` — swap CalendarList → SeasonCalendar

---

### Task 1: Add JpcEvent model to Prisma schema + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum and model to schema**

Open `prisma/schema.prisma`. After the last `enum` block (before the first `model` block), add:

```prisma
enum JpcVisibility {
  ALL
  ALUMNI_ONLY
}
```

In the `model User` block, add a relation field after the last existing relation line:

```prisma
  jpcEventsCreated JpcEvent[] @relation("JpcEventCreator")
```

After the last model in the file, append:

```prisma
model JpcEvent {
  id          Int           @id @default(autoincrement())
  title       String
  date        DateTime
  url         String?
  visibility  JpcVisibility @default(ALL)
  createdById Int
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  createdBy   User          @relation("JpcEventCreator", fields: [createdById], references: [id])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_jpc_events
```

Expected: new migration file created under `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add JpcEvent model with visibility enum"
```

---

### Task 2: Add seasonId to SessionListRow + new query for all active seasons

**Files:**
- Modify: `src/lib/sessions-query.ts`

- [ ] **Step 1: Add `seasonId` to SessionListRow interface**

In `src/lib/sessions-query.ts`, update the `SessionListRow` interface to add `seasonId`:

```ts
export interface SessionListRow {
  id: number;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  location: string | null;
  recurrenceGroupId: string | null;
  attendanceMarked: boolean;
  seasonId: number;
  seasonCode: string;
  seasonTitle: string;
  checkInToken: string | null;
  checkInOpenAt: Date | null;
  checkInClosedAt: Date | null;
}
```

- [ ] **Step 2: Update listSessionsForSeason to include seasonId in select**

In `listSessionsForSeason`, the `season` select already fetches code and title. Add `id` to it and include it in the mapped result:

```ts
export async function listSessionsForSeason(seasonId: number): Promise<SessionListRow[]> {
  const rows = await db.session.findMany({
    where: { seasonId },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      recurrenceGroupId: true,
      checkInToken: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
      _count: { select: { attendance: true } },
      season: { select: { id: true, code: true, title: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
    location: s.location,
    recurrenceGroupId: s.recurrenceGroupId,
    attendanceMarked: s._count.attendance > 0,
    seasonId: s.season.id,
    seasonCode: s.season.code,
    seasonTitle: s.season.title,
    checkInToken: s.checkInToken,
    checkInOpenAt: s.checkInOpenAt,
    checkInClosedAt: s.checkInClosedAt,
  }));
}
```

- [ ] **Step 3: Add listSessionsForAllActiveSeasons**

Append to `src/lib/sessions-query.ts`:

```ts
export async function listSessionsForAllActiveSeasons(): Promise<SessionListRow[]> {
  const rows = await db.session.findMany({
    where: { season: { status: "ACTIVE", deletedAt: null } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      recurrenceGroupId: true,
      checkInToken: true,
      checkInOpenAt: true,
      checkInClosedAt: true,
      _count: { select: { attendance: true } },
      season: { select: { id: true, code: true, title: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
    location: s.location,
    recurrenceGroupId: s.recurrenceGroupId,
    attendanceMarked: s._count.attendance > 0,
    seasonId: s.season.id,
    seasonCode: s.season.code,
    seasonTitle: s.season.title,
    checkInToken: s.checkInToken,
    checkInOpenAt: s.checkInOpenAt,
    checkInClosedAt: s.checkInClosedAt,
  }));
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. (Existing callers of `SessionListRow` will gain the new `seasonId` field — it's additive only.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sessions-query.ts
git commit -m "feat(sessions): add seasonId to SessionListRow, add listSessionsForAllActiveSeasons"
```

---

### Task 3: Create jpc-events-query.ts

**Files:**
- Create: `src/lib/jpc-events-query.ts`

- [ ] **Step 1: Create the query file**

Create `src/lib/jpc-events-query.ts`:

```ts
import { db } from "@/lib/db";
import type { JpcVisibility } from "@/generated/prisma/enums";

export interface JpcEventRow {
  id: number;
  title: string;
  date: Date;
  url: string | null;
  visibility: JpcVisibility;
  createdById: number;
}

export async function listJpcEvents(opts: {
  includeAlumniOnly: boolean;
}): Promise<JpcEventRow[]> {
  return db.jpcEvent.findMany({
    where: opts.includeAlumniOnly ? undefined : { visibility: "ALL" },
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      url: true,
      visibility: true,
      createdById: true,
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/jpc-events-query.ts
git commit -m "feat(jpc-events): add jpc-events-query"
```

---

### Task 4: Create jpc-event-actions.ts

**Files:**
- Create: `src/lib/jpc-event-actions.ts`

- [ ] **Step 1: Create the actions file**

Create `src/lib/jpc-event-actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/rbac";

const jpcEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  date: z.coerce.date(),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  visibility: z.enum(["ALL", "ALUMNI_ONLY"]),
});

export async function createJpcEventAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canManageUsers(user)) throw new Error("Forbidden");

  const parsed = jpcEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    url: formData.get("url"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db.jpcEvent.create({
    data: {
      title: parsed.data.title,
      date: parsed.data.date,
      url: parsed.data.url || null,
      visibility: parsed.data.visibility,
      createdById: user.userId,
    },
  });

  revalidatePath("/super/events");
  revalidatePath("/super/calendar");
  return { success: true };
}

export async function updateJpcEventAction(id: number, formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canManageUsers(user)) throw new Error("Forbidden");

  const parsed = jpcEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    url: formData.get("url"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db.jpcEvent.update({
    where: { id },
    data: {
      title: parsed.data.title,
      date: parsed.data.date,
      url: parsed.data.url || null,
      visibility: parsed.data.visibility,
    },
  });

  revalidatePath("/super/events");
  revalidatePath("/super/calendar");
  return { success: true };
}

export async function deleteJpcEventAction(id: number) {
  const user = await getCurrentUserOrRedirect();
  if (!canManageUsers(user)) throw new Error("Forbidden");

  await db.jpcEvent.delete({ where: { id } });

  revalidatePath("/super/events");
  revalidatePath("/super/calendar");
  return { success: true };
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/jpc-event-actions.ts
git commit -m "feat(jpc-events): add server actions for create/update/delete"
```

---

### Task 5: Add "events" icon to NavIconName and nav-link.tsx + update navigation.ts

**Files:**
- Modify: `src/lib/navigation.ts`
- Modify: `src/components/layout/nav-link.tsx`

- [ ] **Step 1: Add "events" to NavIconName in navigation.ts**

In `src/lib/navigation.ts`, update the `NavIconName` union type to add `"events"`:

```ts
export type NavIconName =
  | "home"
  | "dashboard"
  | "users"
  | "calendar"
  | "events"
  | "assignments"
  | "submissions"
  | "history"
  | "profile"
  | "reports"
  | "groups"
  | "season"
  | "students"
  | "notes"
  | "more"
  | "settings";
```

- [ ] **Step 2: Add calendar + events to super nav in navigation.ts**

In the `SUPER` nav object, add `calendar` and `events` entries:

```ts
const SUPER: RoleNav = {
  sidebar: [
    { href: "/super/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/super/seasons", label: "Seasons", icon: "season" },
    { href: "/super/calendar", label: "Calendar", icon: "calendar" },
    { href: "/super/events", label: "JPC Events", icon: "events" },
    { href: "/super/students", label: "Students", icon: "students" },
    { href: "/super/users", label: "Users", icon: "users" },
    { href: "/super/reports", label: "Reports", icon: "reports" },
    { href: "/super/settings", label: "Settings", icon: "settings" },
  ],
  tabs: [
    { href: "/super/dashboard", label: "Home", icon: "home" },
    { href: "/super/seasons", label: "Seasons", icon: "season" },
    { href: "/super/calendar", label: "Calendar", icon: "calendar" },
    { href: "/super/students", label: "Students", icon: "students" },
    { href: "/super/more", label: "More", icon: "more" },
  ],
};
```

- [ ] **Step 3: Add "events" to iconMap in nav-link.tsx**

In `src/components/layout/nav-link.tsx`, add `CalendarDays` to the lucide import:

```ts
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  FileText,
  Folders,
  GraduationCap,
  History,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Notebook,
  Settings,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
```

Then add to `iconMap`:

```ts
const iconMap: Record<NavIconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  users: Users,
  calendar: Calendar,
  events: CalendarDays,
  assignments: ClipboardList,
  submissions: FileText,
  history: History,
  profile: User,
  reports: FileText,
  groups: Folders,
  season: Sparkles,
  students: GraduationCap,
  notes: Notebook,
  more: MoreHorizontal,
  settings: Settings,
};
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation.ts src/components/layout/nav-link.tsx
git commit -m "feat(nav): add calendar and JPC events to super nav"
```

---

### Task 6: Build the SeasonCalendar component

**Files:**
- Create: `src/components/sessions/season-calendar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/sessions/season-calendar.tsx`:

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Lock } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import type { SessionListRow } from "@/lib/sessions-query";
import type { JpcEventRow } from "@/lib/jpc-events-query";

const SEASON_PALETTE = [
  "bg-info-800 text-info-300",
  "bg-success-800 text-success-300",
  "bg-warning-800 text-warning-300",
  "bg-error-800 text-error-300",
  "bg-brand-navy-700 text-brand-teal-300",
];

function sessionCellClass(s: SessionListRow, seasonColors?: Record<string, string>): string {
  if (seasonColors) return seasonColors[s.seasonCode] ?? "bg-brand-navy-800 text-brand-teal-400";
  if (isToday(s.startsAt)) return "bg-success-800 text-success-300";
  if (isPast(s.startsAt)) return "bg-neutral-700 text-neutral-400";
  return "bg-brand-navy-800 text-brand-teal-400";
}

interface SeasonCalendarProps {
  sessions: SessionListRow[];
  jpcEvents: JpcEventRow[];
  getSessionHref: (id: number) => string;
  seasonColors?: Record<string, string>;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SeasonCalendar({
  sessions,
  jpcEvents,
  getSessionHref,
  seasonColors,
}: SeasonCalendarProps) {
  const [current, setCurrent] = React.useState<Date>(() => {
    const upcoming = sessions.find((s) => !isPast(s.startsAt) || isToday(s.startsAt));
    return startOfMonth(upcoming?.startsAt ?? new Date());
  });

  if (sessions.length === 0 && jpcEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No sessions yet"
        description="Sessions will appear here once they're added to the season."
      />
    );
  }

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const sessionsByDay = new Map<string, SessionListRow[]>();
  for (const s of sessions) {
    const key = format(s.startsAt, "yyyy-MM-dd");
    const arr = sessionsByDay.get(key) ?? [];
    arr.push(s);
    sessionsByDay.set(key, arr);
  }

  const eventsByDay = new Map<string, JpcEventRow[]>();
  for (const e of jpcEvents) {
    const key = format(e.date, "yyyy-MM-dd");
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((d) => subMonths(d, 1))}
          className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold">{format(current, "MMMM yyyy")}</h2>
        <button
          onClick={() => setCurrent((d) => addMonths(d, 1))}
          className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Season legend (super only) */}
      {seasonColors && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(seasonColors).map(([code, cls]) => (
            <span key={code} className={`inline-flex items-center rounded px-2 py-0.5 ${cls}`}>
              {code}
            </span>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden text-xs">
        {/* Headers */}
        {DOW.map((d) => (
          <div
            key={d}
            className="bg-card text-center py-2 font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDay.get(key) ?? [];
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`bg-card min-h-[72px] p-1 flex flex-col gap-0.5 ${!inMonth ? "opacity-40" : ""}`}
            >
              <span
                className={`self-start flex size-6 items-center justify-center rounded-full text-xs font-medium
                  ${today ? "bg-brand-teal-500 text-white" : "text-foreground"}`}
              >
                {format(day, "d")}
              </span>

              {daySessions.map((s) => (
                <Link
                  key={s.id}
                  href={getSessionHref(s.id)}
                  className={`block rounded px-1 py-0.5 truncate font-medium leading-tight
                    ${sessionCellClass(s, seasonColors)}`}
                  title={s.title}
                >
                  {s.title}
                </Link>
              ))}

              {dayEvents.map((e) =>
                e.url ? (
                  <a
                    key={e.id}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-0.5 rounded px-1 py-0.5 truncate leading-tight
                      ${e.visibility === "ALUMNI_ONLY"
                        ? "bg-warning-800 text-warning-300"
                        : "bg-brand-teal-900 text-brand-teal-300"}`}
                    title={e.title}
                  >
                    {e.visibility === "ALUMNI_ONLY" && (
                      <Lock className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">{e.title}</span>
                    <ExternalLink className="size-2.5 shrink-0 ml-auto" />
                  </a>
                ) : (
                  <span
                    key={e.id}
                    className={`flex items-center gap-0.5 rounded px-1 py-0.5 truncate leading-tight
                      ${e.visibility === "ALUMNI_ONLY"
                        ? "bg-warning-800 text-warning-300"
                        : "bg-brand-teal-900 text-brand-teal-300"}`}
                    title={e.title}
                  >
                    {e.visibility === "ALUMNI_ONLY" && (
                      <Lock className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">{e.title}</span>
                  </span>
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/season-calendar.tsx
git commit -m "feat(calendar): add SeasonCalendar month-grid component"
```

---

### Task 7: Update student, leader, and admin calendar pages

**Files:**
- Modify: `src/app/student/calendar/page.tsx`
- Modify: `src/app/leader/calendar/page.tsx`
- Modify: `src/app/admin/season/[code]/calendar/page.tsx`

- [ ] **Step 1: Update student calendar page**

Replace `src/app/student/calendar/page.tsx` entirely:

```tsx
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonCalendar } from "@/components/sessions/season-calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export const metadata = { title: "Calendar" };

export default async function StudentCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  if (!user.activeSeasonId) {
    return (
      <>
        <PageHeader title="Calendar" description="You aren't enrolled in an active season." />
        <EmptyState
          icon={Calendar}
          title="No active season"
          description="An admin will enroll you in a season when you're ready."
        />
      </>
    );
  }

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForSeason(user.activeSeasonId),
    listJpcEvents({ includeAlumniOnly: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${sessions.length} session${sessions.length === 1 ? "" : "s"} in your current season`}
      />
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        getSessionHref={(id) => `/student/sessions/${id}`}
      />
    </>
  );
}
```

- [ ] **Step 2: Update leader calendar page**

Replace `src/app/leader/calendar/page.tsx` entirely:

```tsx
import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonCalendar } from "@/components/sessions/season-calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export const metadata = { title: "Calendar" };

export default async function LeaderCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["LEADER"]);

  if (user.groupLeaderIds.length === 0) {
    return (
      <>
        <PageHeader title="Calendar" description="You don't lead any groups yet." />
        <EmptyState
          icon={Calendar}
          title="No calendar"
          description="An admin will add you to a group when you're ready."
        />
      </>
    );
  }

  const groups = await db.group.findMany({
    where: { id: { in: user.groupLeaderIds } },
    select: { seasonId: true },
  });
  const seasonIds = Array.from(new Set(groups.map((g) => g.seasonId)));

  const [allSessions, jpcEvents] = await Promise.all([
    Promise.all(seasonIds.map((id) => listSessionsForSeason(id))).then((arr) =>
      arr.flat().sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    ),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${allSessions.length} session${allSessions.length === 1 ? "" : "s"}`}
      />
      <SeasonCalendar
        sessions={allSessions}
        jpcEvents={jpcEvents}
        getSessionHref={(id) => `/leader/sessions/${id}`}
      />
    </>
  );
}
```

- [ ] **Step 3: Update admin calendar page**

Replace `src/app/admin/season/[code]/calendar/page.tsx` entirely:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole, canEditSeason } from "@/lib/auth/permissions";
import { loadSeasonByCode } from "@/lib/seasons-query";
import { listSessionsForSeason } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SeasonCalendar } from "@/components/sessions/season-calendar";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `Calendar · ${code}` };
}

export default async function AdminCalendarPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["ADMIN", "SUPER"]);
  const { code } = await params;
  const season = await loadSeasonByCode(code);
  if (!canEditSeason(user, season.id)) redirect("/admin/season");

  const createHref = `/admin/season/${season.code}/calendar/new`;

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForSeason(season.id),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
        actions={<Button render={<Link href={createHref} />}>Add session</Button>}
      />
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        getSessionHref={(id) => `/admin/season/${season.code}/sessions/${id}`}
      />
    </>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/student/calendar/page.tsx src/app/leader/calendar/page.tsx src/app/admin/season/\[code\]/calendar/page.tsx
git commit -m "feat(calendar): swap CalendarList for SeasonCalendar on student, leader, admin pages"
```

---

### Task 8: Create super admin JPC Events management page

**Files:**
- Create: `src/app/super/events/jpc-event-form.tsx`
- Create: `src/app/super/events/page.tsx`

- [ ] **Step 1: Create the JpcEventForm client component**

Create `src/app/super/events/jpc-event-form.tsx`:

```tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createJpcEventAction, updateJpcEventAction } from "@/lib/jpc-event-actions";
import type { JpcEventRow } from "@/lib/jpc-events-query";

interface JpcEventFormProps {
  event?: JpcEventRow;
  onDone: () => void;
}

export function JpcEventForm({ event, onDone }: JpcEventFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = event
      ? await updateJpcEventAction(event.id, fd)
      : await createJpcEventAction(fd);
    setPending(false);
    if (result && "error" in result) {
      setError(result.error);
    } else {
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="title">Title</label>
        <Input
          id="title"
          name="title"
          defaultValue={event?.title}
          placeholder="Spring Retreat"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="date">Date</label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={event ? format(event.date, "yyyy-MM-dd") : ""}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="url">Link (optional)</label>
        <Input
          id="url"
          name="url"
          type="url"
          defaultValue={event?.url ?? ""}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="visibility">Visibility</label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={event?.visibility ?? "ALL"}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">Everyone</option>
          <option value="ALUMNI_ONLY">Alumni only (leaders, admins)</option>
        </select>
      </div>

      {error && <p className="text-sm text-error-500">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the client manager component**

Create `src/app/super/events/jpc-event-manager-client.tsx`:

```tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteJpcEventAction } from "@/lib/jpc-event-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { JpcEventRow } from "@/lib/jpc-events-query";
import { JpcEventForm } from "./jpc-event-form";

interface JpcEventManagerClientProps {
  events: JpcEventRow[];
}

export function JpcEventManagerClient({ events: initialEvents }: JpcEventManagerClientProps) {
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    await deleteJpcEventAction(id);
  }

  if (creating) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">New JPC event</h2>
        <JpcEventForm onDone={() => setCreating(false)} />
      </div>
    );
  }

  if (editingId !== null) {
    const event = initialEvents.find((e) => e.id === editingId);
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">Edit event</h2>
        <JpcEventForm event={event} onDone={() => setEditingId(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4 mr-1.5" />
          New event
        </Button>
      </div>

      {initialEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No JPC events yet"
          description="Create an event to share with all members or alumni."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {initialEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{e.title}</span>
                  <Badge variant={e.visibility === "ALUMNI_ONLY" ? "warning" : "outline"}>
                    {e.visibility === "ALUMNI_ONLY" ? "Alumni only" : "Everyone"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(e.date, "EEE, MMM d, yyyy")}
                </p>
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-teal-500 hover:underline truncate"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    {e.url}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(e.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="size-3.5 text-error-500" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the events list page**

Create `src/app/super/events/page.tsx`:

```tsx
import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { JpcEventManagerClient } from "./jpc-event-manager-client";

export const metadata: Metadata = { title: "JPC Events" };

export default async function SuperEventsPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const events = await listJpcEvents({ includeAlumniOnly: true });

  return (
    <>
      <PageHeader
        title="JPC Events"
        description="Organisation-wide events visible on all members' calendars."
      />
      <JpcEventManagerClient events={events} />
    </>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/super/events/
git commit -m "feat(jpc-events): add super admin events management page"
```

---

### Task 9: Create super admin global calendar page

**Files:**
- Create: `src/app/super/calendar/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/super/calendar/page.tsx`:

```tsx
import type { Metadata } from "next";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { listSessionsForAllActiveSeasons } from "@/lib/sessions-query";
import { listJpcEvents } from "@/lib/jpc-events-query";
import { PageHeader } from "@/components/layout/page-header";
import { SeasonCalendar } from "@/components/sessions/season-calendar";

export const metadata: Metadata = { title: "Calendar" };

const PALETTE = [
  "bg-info-800 text-info-300",
  "bg-success-800 text-success-300",
  "bg-warning-800 text-warning-300",
  "bg-error-800 text-error-300",
  "bg-brand-navy-700 text-brand-teal-300",
];

export default async function SuperCalendarPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);

  const [sessions, jpcEvents] = await Promise.all([
    listSessionsForAllActiveSeasons(),
    listJpcEvents({ includeAlumniOnly: true }),
  ]);

  // Build a color map keyed by seasonCode, cycling through palette
  const seasonCodes = Array.from(new Set(sessions.map((s) => s.seasonCode)));
  const seasonColors: Record<string, string> = {};
  seasonCodes.forEach((code, i) => {
    seasonColors[code] = PALETTE[i % PALETTE.length]!;
  });

  return (
    <>
      <PageHeader
        title="Calendar"
        description="All active seasons across JPC."
      />
      <SeasonCalendar
        sessions={sessions}
        jpcEvents={jpcEvents}
        getSessionHref={(id) => {
          const s = sessions.find((x) => x.id === id);
          return s ? `/admin/season/${s.seasonCode}/sessions/${id}` : "#";
        }}
        seasonColors={seasonColors}
      />
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: no errors, all pages compile.

- [ ] **Step 3: Commit**

```bash
git add src/app/super/calendar/
git commit -m "feat(calendar): add super admin global calendar page"
```

---

### Task 10: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Open `.gitignore` and add at the end:

```
# Brainstorming companion artifacts
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artifacts"
```
