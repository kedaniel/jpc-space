---
name: jpc-design
description: JPC Space design system rules. Use whenever creating, modifying, or reviewing any UI component, page, route, layout, or visual element in the JPC Space project (d:/Projects/jpc-space). Covers brand identity (navy + teal anchored on the logo), Geist Sans-only typography, mobile-first patterns, light/dark theming via next-themes (semantic-token rule), framer-motion presets, the Base UI primitive library, the persistent AppShell architecture (one shell per role layout — never per page), and the self-audit checklist that must run before any screen is reported done. Apply this skill proactively any time a file under `src/app/`, `src/components/`, or `src/lib/navigation.ts` is touched, any time the user mentions UI, styling, components, animation, theming, or visual polish, and any time a new page or layout is being authored.
---

# JPC Space Design System

You are working on **JPC Space**, a seasonal program-management portal for the **Jesus Project Community (JPC)** — a Christian student community focused on discipleship, servanthood, and witness. The app is a sibling of the production **Money Manager** app at `D:\Projects\Money Manager\money-manager`; the two should feel like members of the same family. JPC Space is used by people aged roughly 18–50, so readability and quiet confidence matter more than novelty for its own sake.

Every UI artifact produced in this project must follow the rules below. These rules exist because past iterations of this app drifted into a generic "AI-starter" aesthetic (white card on white, blue button, identical spacing, Inter everywhere) and lost any sense of identity. The rules below give the brand back its character without becoming loud or childish.

If a rule below conflicts with the broader project `CLAUDE.md`, the more specific rule wins — but they are designed to agree. If they appear to disagree, surface the conflict instead of guessing.

---

## Brand voice

- **Warm, welcoming, rooted.** Not corporate, not sterile, not playful-toy. Think *Linear's typographic restraint × Vercel's spatial calm × a softer color story*.
- **Human copy.** Prefer "Welcome back to the community" over "Login successful". Prefer "Nothing here yet — invite your first member" over "No data". Avoid jargon unless the audience is admin-only.
- **Confidence over cleverness.** Don't pun, don't apologize. Empty states encourage; error states explain.

---

## Typography

The **only** fonts permitted in this codebase:

| Token | Family | Source | Use |
|---|---|---|---|
| `--font-sans` | **Geist Sans** | `next/font/google` | Everything readable — body, UI, all headings (h1–h6), wordmark. |
| `--font-mono` | **Geist Mono** | `next/font/google` | Code, IDs, season codes, public IDs, technical readouts. |

That is the entire approved type system. Two families: Geist Sans and Geist Mono. Geist Sans is also used for the "JPC Space" wordmark in the sidebar — no decorative serif, no display face. The earlier Fraunces experiment was removed because the serif read as decorative and hurt UI clarity for a working app.

Never use Inter, Fraunces, Arial, Roboto, system stacks, or any other family. Do not re-introduce Fraunces or any `font-heading` class. If you see one, remove it.

**Scale (Tailwind v4):** `text-xs` (12), `text-sm` (14), `text-base` (16), `text-lg` (18), `text-xl` (20), `text-2xl` (24), `text-3xl` (30), `text-4xl` (36), `text-5xl` (44 — reserved for hero numbers and big empty-state copy).

**Weights:** body 400, labels & nav 500, headings 600 (700 only for the rare hero).

**Geist features:** `font-feature-settings: "ss01", "ss03"` is applied to `body` in `globals.css` for Geist's stylistic alternates. Do not add `cv11` — that's an Inter feature and Geist ignores it.

**Heading letter-spacing:** `globals.css` applies `letter-spacing: -0.015em` to `h1`/`h2`/`h3` globally — don't repeat `tracking-tight` on every heading; it's a sensible default.

---

## Color tokens

The only colors permitted are these tokens (defined in `src/app/globals.css`). Off-system color is a defect: raw Tailwind colors like `bg-blue-500`, arbitrary hex like `bg-[#abc123]`, inline RGB, or `style={{ color: ... }}` must all be fixed.

### Brand
- `brand-navy-950 … 50` — primary brand. `900` is the sidebar/dark surface; `500` is brand text on light.
- `brand-teal-950 … 50` — accent. `500` is primary action / active state; `100` is tinted surfaces; `400`/`600` for hover variants.

### Neutrals
`neutral-50 … 950` — backgrounds, borders, body text, muted labels. `50` is app bg in light, `950` is app bg in dark; `200` is borders; `500`/`600` are muted text.

### Semantic
`success-*`, `warning-*`, `error-*`, `info-*` — each ranges 50–950. Use the `500` for solid fills, `100` for soft backgrounds, `700`/`800` for foreground text on light tinted bg.

### Role badges (immutable mapping — never change these)
- SUPER: `brand-navy-900` bg / white fg
- ADMIN: `brand-teal-500` bg / `brand-navy-900` fg
- LEADER: `purple-500` bg / white fg
- STUDENT: `warning-500` bg / white fg
- MENTOR: `success-500` bg / white fg

The role-badge purple is the **only** sanctioned use of purple in this app — never use purple as a brand surface, gradient stop, or accent. Purple-gradient-on-white is an AI cliché; we do not do it.

### Semantic aliases
Prefer the semantic alias tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-destructive`, `border-border`, `ring-ring`) over raw brand scales in component code — they automatically follow light/dark mode. Use the raw brand scales only when you specifically need to anchor to a brand color regardless of theme (e.g., the sidebar surface, role badges).

---

## Light & dark mode

Theming runs through **`next-themes`** with `attribute="class"` on `<html>`. Both modes are first-class — no screen is "light-mode only".

- All tokens have light and dark values defined in `:root` / `.dark` blocks in `globals.css`. When you add a new design token, define both values.
- Use semantic alias tokens in components — they switch with the class. Raw scales (e.g., `bg-brand-navy-900`) lock to that color in both modes; use them deliberately for surfaces like the sidebar that should look the same regardless of theme, or pair them with a dark variant (`dark:bg-brand-navy-950`).
- The theme toggle lives in the top bar (icon button, Sun/Moon cross-fade). Mobile users also get the toggle inside the user-menu dropdown.
- `<html suppressHydrationWarning>` is required to silence the unavoidable first-paint mismatch.

### The semantic-token rule (do not forget this)

`bg-white`, `bg-neutral-*`, `text-neutral-*`, `border-neutral-*` **do not auto-flip** between light and dark — they are raw scales locked to their hex value. Using them for surfaces, text, or borders is the #1 cause of dark-mode bleed-through where a page looks great in light mode and renders a white island inside a dark shell.

The mapping you should use almost everywhere:

| Don't use | Use instead |
|---|---|
| `bg-white` | `bg-card` |
| `bg-neutral-50` (subtle bg) | `bg-muted/40` |
| `bg-neutral-100` (chip bg) | `bg-muted` |
| `bg-neutral-200` (track) | `bg-muted` or `bg-border` |
| `border-neutral-100/200/300` | `border-border` (or `border-border/60` for softer) |
| `text-neutral-900` | `text-foreground` |
| `text-neutral-700` | `text-foreground` |
| `text-neutral-600/500/400` | `text-muted-foreground` |
| `bg-red-50 text-red-700` | `bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-200` |
| `bg-emerald-50 text-emerald-700` | `bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-200` |

For semantic-tinted banners (success/error/warning/info), always pair the light tint with a dark variant — the `*-50` tones go invisible in dark mode without `dark:bg-*-950`.

The only sanctioned places for raw `neutral-*` classes are:
- `globals.css` token definitions
- `chart-colors.ts` (the chart palette)
- The `swatches.ts` design-system showcase
- Anywhere that explicitly needs to anchor to a specific tone regardless of theme (rare — annotate why).

---

## Backgrounds (clean, no gradient mesh)

The previous "atmospheric gradient mesh" (`body::before` radial-gradient mixing teal + navy) was removed because it added a perceptible green/blue tint to the dark surface that didn't match the logo's clean navy. The current rule is simpler and stricter:

- **Light mode body bg** — `bg-background` = `neutral-50` (a soft warm-cool white).
- **Dark mode body bg** — `bg-background` = `brand-navy-950` (a deep, slightly blue-leaning near-black anchored on the logo). Not `neutral-950` — the logo navy is the brand truth, and using it as the dark canvas keeps the app cohesive with the mark.
- **Card surfaces in dark** — `bg-card` = `brand-navy-900`. Cards sit one shade above the body so they're distinguishable without a hard border.
- Do **not** reintroduce a gradient mesh, grain texture, or `body::before` / `body::after` decorative layer. The brand "feel" comes from the navy/teal palette + composition, not from atmospheric fog.

Auth pages (`/login`, `/forgot-password`, `/reset-password`, `/forbidden`) use the same plain body bg with the logo card centered.

---

## Spacing, radii, elevation

- **Card padding:** `p-4 md:p-6`.
- **Section gap:** `gap-4 md:gap-6`.
- **Page container:** `max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8`. (Was `max-w-6xl` historically — 7xl is current.)
- **Touch targets on mobile:** minimum 44 × 44px. Bottom nav items are `h-14`.
- **Base radius:** `--radius: 0.625rem`. Friendlier than the historical 0.5rem, restrained vs. Money Manager's 0.75rem.
- **Radii by surface:**
  - `rounded-md` — inputs, small chips
  - `rounded-lg` — buttons
  - `rounded-xl` — modals, popovers
  - `rounded-2xl` — cards, hero surfaces
  - `rounded-full` — avatars, pills, FAB, active-nav pill
- **Elevation tokens** (defined in globals.css):
  - `--shadow-soft` — cards at rest
  - `--shadow-pop` — cards on hover, popovers
  - `--shadow-lift` — modal, FAB, drag preview

Never use inline `style={{ borderRadius: 12 }}` or `style={{ boxShadow: ... }}` — there is a utility for it.

---

## Motion

Motion is part of the brand. We use **framer-motion** for orchestrated moments and **`tw-animate-css`** + Tailwind transitions for utility animations.

All motion presets live in **`src/lib/motion.ts`** so the app speaks one motion vocabulary. Use them — do not sprinkle ad-hoc `transition={{ duration: 0.123 }}` configs in components.

Canonical presets:

- `fadeUp` — opacity 0→1, y 8→0, 240ms, ease-out-soft. List/card entries.
- `staggerChildren` — 60ms stagger, used on parent containers wrapping list items.
- `pageTransition` — opacity + 4px translate, 180ms. Used by `src/app/template.tsx`.
- `springSoft` — `{ type: "spring", stiffness: 280, damping: 28 }`. Sidebar width changes, shared-layout pills.
- `tap` — `{ scale: 0.97 }`. Buttons, interactive cards, nav links.
- `hover` — `{ y: -2 }`. Interactive cards.

**Hero motion moments** (one per screen, not five):
- Page transition on route change (root `template.tsx`).
- Shared-layout active pill in the sidebar (`layoutId="nav-active"`).
- Staggered card reveal on dashboard load.
- Modal entry: mobile slides up (spring), desktop scales 0.96→1 + fades.

**Utility motion** (everywhere, free):
- All interactive elements: `transition-all duration-200 ease-[var(--ease-out-soft)]` for color/shadow/transform changes.
- Selects/disclosures: chevron `data-[state=open]:rotate-180 transition-transform`.
- Skeletons: shimmer keyframe (mask-image sweep), not the static pulse.
- Focus ring: `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.

**Duration / easing tokens** (in globals.css):
- `--duration-fast: 120ms`, `--duration-base: 200ms`, `--duration-slow: 320ms`
- `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)`

Don't animate everything just because you can — under-motion is more elegant than over-motion. Hover-lift a card, but don't also bounce it. Pick the hero moment, then stop.

---

## Toasts and inline feedback

- Post-action confirmations use **Sonner** via `<Toaster richColors closeButton position="top-right" />` mounted once in `app/layout.tsx`. Call `toast.success(...)` / `toast.error(...)` from server-action result handlers.
- **Inline form errors stay inline** — they're contextual to the field. Don't replace inline validation with toasts.
- Loading states on action buttons: render a spinner inside the button via the `Button`'s built-in `loading` prop; never leave the button visually unchanged during a pending action.

---

## Mobile-first rule (non-negotiable)

Every screen is designed and verified at **375px width first**, then enhanced with `md:` (≥768px) and `lg:` (≥1024px) breakpoints. If you find yourself writing a `md:` class before having a clear mental picture of the mobile layout, stop and restart from the mobile view.

Patterns:
- **Modals → bottom sheets** below `md`. Slide-up entry, `rounded-t-2xl`, drag-affordance handle, swipe-to-dismiss.
- **Tables → stacked cards** below `md`. The `<DataTable>` primitive handles this — never write a raw `<table>` in feature code.
- **Long forms → sticky bottom action bar** below `md`. Primary action full-width.
- **Sidebar → bottom tab bar** below `md`. Five items max; everything else lives behind a "More" tab.
- **FAB sits at `bottom-20 right-4`** (above the bottom nav).
- No horizontal scroll. Ever. If content overflows, it wraps, truncates with a tooltip, or scrolls *within* its own container.

---

## Layout shell

The `<AppShell>` ([src/components/layout/app-shell.tsx](src/components/layout/app-shell.tsx)) is mounted **once per role group** by the role-level layout — not per page. Concretely:

- `src/app/super/layout.tsx`, `admin/layout.tsx`, `leader/layout.tsx`, `student/layout.tsx`, `mentor/layout.tsx` each render `<RoleLayout allowedRoles={[...]}>{children}</RoleLayout>`. `RoleLayout` ([src/components/layout/role-layout.tsx](src/components/layout/role-layout.tsx)) loads the user, calls `requireRole`, and wraps children in `AppShell`.
- **Page files never render `AppShell` themselves.** They just `return <>...page content...</>`. The shell — sidebar, top bar, bottom nav — is provided by the layout above them and persists across in-segment navigations (no flash, no remount).
- The only routes that render outside `AppShell` are `/login`, `/forgot-password`, `/reset-password`, `/forbidden`. (No layout file in those paths.)
- **Page transitions** live in per-role `template.tsx` files (`app/<role>/template.tsx` → `<RouteTransition>`). Templates re-mount on every navigation, so the transition runs; the layout above the template stays mounted, so the sidebar persists. Do **not** add a root `app/template.tsx` — it would unmount the layouts and re-introduce the sidebar flash.

Inside the shell:

- **Sidebar** (`md+`) — collapsible (width animates between `w-60` and `w-16` via `springSoft`); collapsed state persisted to `localStorage` via `sidebar-context.tsx`. Header shows `<Logo size="md" showWordmark />`. Active nav item has a shared-layout pill (`layoutId="nav-sidebar-active"`).
- **Top bar** — glassmorphic: `jpc-glass border-b border-border/60`. Contains a page title derived from `usePathname()` (last meaningful segment, title-cased — pages no longer pass a `title` prop), theme toggle, notifications bell, user menu. On mobile the title and a small logo replace the sidebar.
- **Bottom nav** (`<md`) — 5 items max from `tabs` in `src/lib/navigation.ts`. Active indicator slides with `springSoft`.
- **Navigation source of truth** — `src/lib/navigation.ts`. Never hardcode nav items in a layout file. To change nav, edit `navByRole`.

---

## Component library

UI primitives live in `src/components/ui/`; layout primitives in `src/components/layout/`. Both are built on **`@base-ui/react`** (Base UI), not Radix. Money Manager uses Radix; we deliberately do not — Base UI's accessibility and styling story is sufficient and switching would cost a week with no user-visible benefit.

**Before creating any component, check whether it already exists.** The full inventory is rendered live at `/dev/design-system` — open that page first.

Existing primitives (do not duplicate):

`button`, `card`, `modal` (responsive bottom-sheet on mobile), `select`, `tabs`, `label`, `field`, `input`, `textarea`, `badge` (with role variants), `avatar`, `progress`, `separator`, `skeleton`, `date-picker`, `time-picker`, `combobox`, `multi-select`, `chip-input`, `file-upload`, `rich-text-editor`, `rich-text-view`, `data-table`, `confirm-dialog`, `empty-state`, `logo`, `theme-toggle`, `toaster`.

Layout: `app-shell`, `top-bar`, `nav-link`, `user-menu`, `notification-bell`, `page-header`, `sidebar-context`.

Motion wrappers: `src/components/motion/page-transition.tsx`.

**If a needed variant is missing**, extend the existing component with a new variant (`size`, `tone`, `intent`). **Never fork or duplicate.**

**Never write raw `<input>`, `<button>`, `<select>`, `<dialog>`, or `<table>`** in feature code. They will not match the design system and they will fail the audit.

**Base UI hydration rule** (from project CLAUDE.md, repeated because it bites): any file that renders Base UI primitives (Select, Dialog, Popover, Tabs…) must have `'use client'` at the top, or you'll get `aria-controls` ID mismatches between SSR and client hydration.

---

## Logo

- Asset: `public/jpc-logo.jpg` (copied from Money Manager — same brand mark).
- Component: `<Logo size="sm | md | lg" showWordmark />` from `src/components/ui/logo.tsx`. Renders the image via `next/image`. With `showWordmark`, appends "JPC Space" in Fraunces.
- Used in: sidebar header, mobile top bar, auth pages.
- Don't render the logo as a raw `<img>` — always go through the component so sizing and the wordmark font stay consistent.

---

## Required state coverage

Every screen ships with all of these or it's incomplete:

- **Empty state** — Every list view has an `<EmptyState>` with an icon in a tinted circle, a warm headline, supportive subcopy, and a CTA when an action exists.
- **Skeleton** — Every async boundary has a `<Skeleton>` layout that matches the loaded view. Use the shimmer skeleton, not the static pulse, and not a spinner.
- **Loading on actions** — Every action button shows a spinner during pending server actions. The button's label stays in place; opacity drops.
- **Inline errors** — Every form field shows inline validation errors via the established `<Field>` error pattern.
- **Error boundary** — Every route segment has an `error.tsx`.

---

## Required dependencies

These three deps are foundational. If they're missing, install them before continuing:

- **`framer-motion`** — orchestrated motion.
- **`sonner`** — toasts.
- **`next-themes`** — light/dark toggle.

`tw-animate-css` is already imported in `globals.css` for utility CSS animations; don't add a second utility-animation library.

---

## Anti-patterns (do not commit these)

- White card on white background with a blue button — the generic "AI starter" look. Use `bg-card` for cards and `bg-primary text-primary-foreground` for actions; the navy/teal brand will distinguish it automatically.
- Purple gradients on white. We have one sanctioned purple (LEADER badge) and that's all.
- Centering *everything* on the screen. Use the page container; let content breathe asymmetrically where it earns it.
- Identical padding everywhere. Let hierarchy emerge from spacing.
- Multiple modals stacked. If you need a sub-decision inside a modal, use an inline expansion or a confirm-dialog; don't open another modal on top.
- Adding a tooltip to compensate for an unclear label. Fix the label.
- `console.log` left in. `// TODO` left in. Skip / xfail left in without a cleanup date.

---

## Self-audit (run before declaring a screen done)

Run this checklist and report the results in your response. Don't skip it — the audit is the contract.

1. **Token audit** — grep the changed files for off-system color and raw scales that break dark mode: `bg-blue|bg-red|bg-gray|bg-slate|bg-zinc|text-gray|text-slate|bg-white\b|bg-neutral-\d|text-neutral-\d|border-neutral-\d|#[0-9a-fA-F]{3,6}`. Should return zero hits in feature code. (Tokens in `globals.css` and the sanctioned `chart-colors.ts` / `swatches.ts` are the only allowed source of hex / raw neutral scales.) Bare `bg-white` is especially dangerous — it stays white in dark mode and creates a light island on a dark page.
2. **Font audit** — confirm no element renders in a serif fallback that wasn't supposed to (Fraunces is the only sanctioned serif, and only on headings/logo). If you see Times-style serif on body text, the font isn't loading — fix it.
3. **Component audit** — list every UI primitive used. Each must come from `src/components/ui/` or `src/components/layout/`. No raw `<input>`/`<button>`/`<table>`/etc.
4. **Mobile audit** — confirm the screen was checked at 375px. No horizontal scroll, no cut-off text, no unreachable buttons. Touch targets ≥ 44px.
5. **Theme audit** — open the screen in both light and dark. Tokens used so nothing is locked to a single mode by accident.
6. **State audit** — confirm loading, empty, and error states all exist where applicable. Action buttons show pending state.
7. **Motion audit** — page transition works; no jank; no animation longer than 320ms on routine interactions.
8. **Permission audit** (for any new Server Action) — an RBAC helper from `src/lib/rbac.ts` is called *before* any mutation.

If any check fails, fix it before reporting the screen complete.

---

## When in doubt

- Open `/dev/design-system` and copy a pattern from there.
- Look at the sibling Money Manager app at `D:\Projects\Money Manager\money-manager` — same community, same brand spirit, slightly different stack (Radix vs Base UI). Useful for color/composition reference, not for direct component copy.
- Read the project root `CLAUDE.md` and `AGENTS.md` for the framework-level rules (Next 16, Prisma 7, Auth.js v5 specifics).
- Surface the conflict rather than guessing. A wrong UI shipped is worse than a question asked.
