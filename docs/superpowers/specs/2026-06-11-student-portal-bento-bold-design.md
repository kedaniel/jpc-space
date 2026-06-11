# Student Portal — Bento Bold UI Redesign

**Date:** 2026-06-11  
**Status:** Approved  
**Scope:** All student portal pages (`/student/*`) as prototype; same system will extend to all roles later.  
**Mode:** Light mode only (student portal). Dark mode toggle remains for other roles.

---

## 1. Design Direction

**Bento Bold** — clean light background, asymmetric bento card grid, large bold numbers, navy + teal brand palette. Inspired by iOS 18 / Stripe dashboard aesthetics. Gen-Z friendly without sacrificing clarity.

### Visual identity

| Token | Value | Use |
|---|---|---|
| Page background | `brand-navy-50` (`#ECEFF7`) | App shell background — use `bg-brand-navy-50` |
| Card surface | `white` | All bento cards |
| Card shadow | `0 1px 3px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.04)` | Every white card |
| Card radius | `rounded-xl` (12px) | Standard card |
| Hero card radius | `rounded-2xl` (16px) | Full-width hero cards |
| Navy hero bg | `brand-navy-900 → brand-navy-700` gradient | Progress / profile hero cards |
| Teal light bg | `brand-teal-100` (`#DAF0F1`) | Accent/highlight cards |
| Page max-width | `max-w-2xl` on mobile-first; no sidebar | Student portal is single-column |
| Grid gap | `gap-3 md:gap-4` | Between bento cards |

### Typography

| Element | Size / Weight | Color |
|---|---|---|
| Page greeting (`Hi, Alex 👋`) | `text-2xl font-black` (900) | `brand-navy-900` |
| Section heading | `text-base font-bold` | `brand-navy-900` |
| Card label (uppercase) | `text-[10px] font-bold tracking-widest uppercase` | `neutral-400` |
| Big stat number | `text-3xl font-black` | `brand-navy-900` or `white` on dark cards |
| Body / list title | `text-sm font-semibold` | `brand-navy-900` |
| Subtext / meta | `text-xs` | `neutral-500` |

### Card variants

1. **White card** — default, all info cards, lists, sessions
2. **Navy hero card** — `bg-gradient-to-br from-brand-navy-900 to-brand-navy-700` — used for the primary progress/profile card on each page
3. **Teal accent card** — `bg-brand-teal-100` — used for secondary highlights (pending count, streak)
4. **Dashed empty card** — `border-2 border-dashed border-neutral-200 bg-white` — empty states

### Tag / pill system

| Variant | Background | Text | Use |
|---|---|---|---|
| `teal` | `brand-teal-100` | `brand-teal-800` | Active, upcoming, enrolled |
| `navy` | `brand-navy-50` | `brand-navy-800` | Neutral labels |
| `orange` | `warning-100` | `warning-700` | Draft, due soon |
| `red` | `error-100` | `error-700` | Overdue, past due |
| `green` | `success-100` | `success-700` | Submitted, reviewed |

---

## 2. AppShell Changes (Student Layout)

The student layout (`src/app/student/layout.tsx`) wraps all pages in AppShell. Changes needed:

- **Force light mode** for the student shell: wrap content in a `data-force-light` div that overrides the user's system preference. The theme token `background` resolves to white in light mode — this is what we want.
- **Top bar** stays the same component but its background should be `brand-navy-900` (already the case in dark-text token) — confirmed correct from mockups.
- **Page background**: add `bg-brand-navy-50` to the student layout's main content area instead of the default `bg-background`.
- **No sidebar** — students use bottom nav on mobile, top nav on desktop. No changes needed to navigation structure.
- **Layout background change also applied to `bg-[#EFF2F7]` references in mockups** — implementation uses `bg-brand-navy-50` throughout.

---

## 3. Page-by-Page Breakdown

### 3.1 Dashboard (`/student/dashboard`)

Current: vertical stack of plain white cards.  
New: bento grid with a hero progress card and supporting stat tiles.

**Layout (mobile-first, single column → 2-col on md):**

```
┌─────────────────────────────────────┐
│  Hi, Alex 👋                        │
│  [Season 2025 chip]                 │
├─────────────────────────────────────┤
│  NAVY HERO: Season Progress         │
│  65% ──────────────── Week 6/10     │
│  [progress bar]      5/8 assignments│
├──────────────┬──────────┬───────────┤
│  Attendance  │  Streak  │  Pending  │
│     92%      │   🔥 4   │     2     │
│  (white)     │  (white) │  (teal)   │
├─────────────────────────────────────┤
│  Next session (white card)          │
│  ● Portfolio Review                 │
│    Tomorrow · 10:00 AM · 90 min     │
├─────────────────────────────────────┤
│  Due soon (white card, if any)      │
├─────────────────────────────────────┤
│  [Cal] [Tasks] [History] [Profile]  │
│  Quick-nav 4-col strip              │
└─────────────────────────────────────┘
```

**When not enrolled:** replace the hero + stats with a single dashed empty-state card + profile completion nudge card.

---

### 3.2 Assignments List (`/student/assignments`)

**Layout:**
```
┌─────────────────────────────────────┐
│  Assignments           [All|Pending]│
│  Spring Cohort 2025                 │
├──────────────┬──────────┬───────────┤
│  Submitted   │ Pending  │ Reviewed  │
│     5        │    2     │     3     │
│  (white)     │  (teal)  │  (white)  │
├─────────────────────────────────────┤
│  WHITE CARD — list                  │
│  ● Project Proposal  [Overdue]      │
│  ● Reflection #6     [Draft]        │
│  ● Portfolio Intro   [Reviewed]     │
│  ● Reflection #5     [Submitted]    │
└─────────────────────────────────────┘
```

Status dot colors: red=overdue, amber=draft/pending, green=submitted/reviewed.

---

### 3.3 Assignment Detail (`/student/assignments/[id]`)

**Layout:**
```
┌─────────────────────────────────────┐
│  ← Assignments                      │
│  [Assignment title]                 │
│  [Due tag]  [Status tag]            │
├─────────────────────────────────────┤
│  Brief (white card)                 │
│  Description text...                │
├─────────────────────────────────────┤
│  Your submission (white card)       │
│  RichTextEditor / RichTextView      │
├─────────────────────────────────────┤
│  [Submit Assignment]  ← navy button │
└─────────────────────────────────────┘
```

If reviewed: show Feedback card (teal accent) above the submission card.

---

### 3.4 Calendar (`/student/calendar`)

**Layout:**
```
┌─────────────────────────────────────┐
│  June 2025                  [‹] [›] │
├─────────────────────────────────────┤
│  WHITE CARD — month grid            │
│  M  T  W  T  F  S  S               │
│  ... [today=navy] [session=teal] ...│
│  Legend: ● today  ● session         │
├─────────────────────────────────────┤
│  Upcoming sessions (white card)     │
│  ● Portfolio Review  [Tomorrow]     │
│  ● Group Workshop    [Jun 19]        │
└─────────────────────────────────────┘
```

---

### 3.5 Session Detail (`/student/sessions/[id]`)

**Layout:**
```
┌─────────────────────────────────────┐
│  ← Calendar                         │
│  NAVY HERO — session title          │
│  Date · Time · Duration · Location  │
├─────────────────────────────────────┤
│  Details (white card)               │
│  Description / agenda               │
├─────────────────────────────────────┤
│  Attendance status (teal/white card)│
│  Present / Absent / Late            │
└─────────────────────────────────────┘
```

---

### 3.6 History (`/student/history`)

**Layout:**
```
┌─────────────────────────────────────┐
│  History                            │
│  All your past seasons              │
├─────────────────────────────────────┤
│  WHITE CARD (per past season)       │
│  Season title · Year                │
│  [progress bar]   X/Y assignments   │
│  Attendance: Z%   Sessions: N       │
└─────────────────────────────────────┘
```

Empty state if no past seasons.

---

### 3.7 Profile (`/student/profile`)

**Layout:**
```
┌─────────────────────────────────────┐
│  NAVY HERO — avatar + name          │
│  [Season chip]  [Group chip]        │
├──────────────┬──────────┬───────────┤
│  Attendance  │  Tasks   │  Streak   │
│     92%      │   5/8    │   🔥 4    │
├─────────────────────────────────────┤
│  About (white card, info list)      │
│  Email · Leader · Member since      │
├─────────────────────────────────────┤
│  Avatar upload (existing component) │
└─────────────────────────────────────┘
```

---

### 3.8 Season (`/student/season`)

Shows details about the current season: description, group, leader info.

**Layout:**
```
┌─────────────────────────────────────┐
│  NAVY HERO — season title           │
│  Start → End dates                  │
├─────────────────────────────────────┤
│  Description (white card)           │
├──────────────┬──────────────────────┤
│  My group    │ My leader            │
│  Group A     │ Maria Santos         │
│  (white)     │ (white)              │
└─────────────────────────────────────┘
```

---

### 3.9 Notifications (`/student/notifications`)

Straightforward list — no bento grid needed here, just white cards per notification with a read/unread state dot.

---

### 3.10 Settings (`/student/settings`)

Vertical list of setting groups (white cards). Keep existing structure, just apply the new card style and background color.

---

## 4. Shared Component Changes

### New / modified components

| Component | Change |
|---|---|
| `PageHeader` | Remove — replaced inline with the greeting + chip pattern per page |
| `Card` / `CardHeader` / `CardContent` | Keep — but stop using `CardHeader`/`CardTitle` for bento; use raw padding + label div instead |
| `Badge` | Keep existing — map to new tag pill variants via existing `variant` prop |
| `Progress` | Keep — used inside hero card |
| `Button` (primary) | Keep — navy background already matches |
| Quick-nav strip | New shared component: `StudentQuickNav` (4 icon links) |
| Bento stat card | New micro-component: `StatCard` — label + big number, optional variant (white/teal/navy) |

### What does NOT change

- All data-fetching logic (server components, queries)
- Auth / permission checks
- Existing `src/components/ui/` primitives (Button, Badge, Progress, Modal, etc.)
- Navigation config (`src/lib/navigation.ts`)
- AppShell structure

---

## 5. Light-Mode Enforcement

The student layout adds a wrapper that forces light tokens regardless of system/user preference:

```tsx
// src/app/student/layout.tsx — add to the content wrapper div
className="light" // next-themes: forces light class on this subtree
```

This means `bg-background` resolves to white, `text-foreground` resolves to dark — correct for Bento Bold.

---

## 6. Implementation Order

Build in this sequence so each page is shippable independently:

1. **Layout background** — change `bg-background` to `bg-[#EFF2F7]` + force light mode in student layout
2. **Dashboard** — highest visibility, validates the pattern
3. **Assignments list + detail** — second most visited
4. **Profile** — avatar already built, just needs layout rework
5. **Calendar** — self-contained, existing calendar logic untouched
6. **Season + Session detail** — simpler, same hero card pattern
7. **History** — straightforward list
8. **Notifications + Settings** — minimal changes

---

## 7. Out of Scope

- Admin, Leader, Mentor, Super portal redesigns (future — same design system)
- Dark mode for student portal
- New features / data not already fetched
- Typography font change (stays Geist Sans per design system)
- Animation changes beyond existing `StaggerReveal` / framer-motion presets
