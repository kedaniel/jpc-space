# JPC Space — Claude Context

## Project Overview

A seasonal program-management portal. Admins run **Seasons** (courses) containing **Groups**, **Sessions** (calendar events), and **Assignments**. Students enroll in seasons, are placed in a current group, attend sessions, and submit work. Leaders run their groups; mentors get read-all visibility; SUPER users have global oversight.

Built with **Next.js 16 App Router**, **React 19**, **TypeScript**, **Prisma 7** (PostgreSQL via `@prisma/adapter-pg`), **Auth.js v5** (`next-auth@5-beta`, credentials provider), **Tailwind v4**, and shadcn-style components on top of **Base UI** (`@base-ui/react`). Package manager is **npm**.

> This is **not** the Next.js you may know — Next 16 / React 19 / Prisma 7 / Auth.js v5 all have breaking changes. Read the relevant guide under `node_modules/next/dist/docs/` before writing code that touches framework APIs.

---

## First-time setup (Claude Code)

This repo ships its Claude Code configuration in `.claude/` so every collaborator gets the same plugins, custom skill, and slash commands. After cloning:

1. **Install Claude Code** — see https://docs.claude.com/en/docs/claude-code/overview
2. **Open this project in Claude Code.** On first launch it reads `.claude/settings.json` and prompts you to install any missing plugins from the built-in `claude-plugins-official` marketplace (auto-installed by Claude Code itself — no separate registry setup):
   - `superpowers` — workflow skills (TDD, brainstorming, code review, …)
   - `frontend-design` — UI design quality guidance
   - `chrome-devtools-mcp` — Chrome DevTools MCP server (bundled with the plugin; no separate `.mcp.json` needed)
3. **Accept the install prompts** for all three.
4. **Verify** with `/plugin list` (all three should show enabled) and `/skills` (you should see `jpc-design`, `init-feature`, `finalize-feature`, plus the `superpowers:*` and `frontend-design:*` skills).

User-specific state — `.claude/settings.local.json` (your personal `permissions.allow` list), `.claude/cache/`, `.claude/local/`, `.claude/.session` — is gitignored. Add your own permission allowlist to `settings.local.json`; do not edit the shared `settings.json` for personal preferences.

---

## Project Structure

```
src/
  app/
    api/                # Route handlers (e.g. api/auth/[...nextauth]/route.ts)
    layout.tsx, page.tsx, globals.css

  lib/                  # Shared library code — DB, auth, RBAC, storage, helpers
    db.ts               # Prisma client singleton (PrismaPg adapter)
    auth.ts             # Auth.js v5 config + JWT scope loading
    rbac.ts             # Role/scope helpers (isAdminOfSeason, isLeaderOfGroup, …)
    invites.ts          # Invite-token logic
    public-id.ts        # nanoid generator for Submission.publicId
    slug.ts             # URL slug helpers
    storage/            # Storage interface + Local/S3 drivers
    utils.ts

  components/
    ui/                 # shadcn-style primitives on Base UI

  generated/prisma/     # Generated Prisma client — import from here, NOT @prisma/client

prisma/
  schema.prisma         # Single source of truth for DB schema
  migrations/
  seed.ts
```

Path alias `@/*` → `src/*`.

---

## Commands

```
npm run dev          # next dev
npm run build        # next build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:generate  # prisma generate
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # prisma studio
```

Required env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `STORAGE_DRIVER`. See `.env.example`.

---

## Git Workflow

- Branch from `main`: `feat/<name>`, `fix/<name>`, `chore/<name>`, `docs/<name>`, `refactor/<name>`, `test/<name>`
- All branches use **kebab-case**, concise and descriptive
- Open a **PR** and merge to `main` — never commit directly to `main`
- Keep PRs focused — one feature or fix per PR

---

## Database

- Schema lives in `prisma/schema.prisma` and is the single source of truth
- Apply schema changes with `npx prisma migrate dev` — and **get user approval before running it** (the schema header comment is the review gate)
- Prisma client is generated to `src/generated/prisma/`; import from `@/generated/prisma/client`, `@/generated/prisma/enums`, etc. — **never** from `@prisma/client`
- Use the singleton `db` exported from `@/lib/db` — do not instantiate `PrismaClient` directly
- **Soft delete** (`deletedAt`) applies to `User`, `Season`, `StudentProfile`, `Assignment` — set the timestamp, do not hard-delete those records
- **Audit columns** (`createdById` / `updatedById`) exist on `Season`, `Assignment`, `Submission` — populate them on every create/update of those entities from the current session user
- URL identifiers: `Season.code` (human-readable slug), `Submission.publicId` (nanoid, 10 chars via `newPublicId()`). Everything else uses the integer `id`
- Integer PKs throughout (`Int @id @default(autoincrement())`); do not switch to BigInt/UUID

---

## Access Control

Five roles. Authorization is **scoped**, not flat — `ADMIN` and `LEADER` only apply within specific seasons/groups, which are loaded into the JWT at sign-in.

| Role     | Scope                                                                 |
|----------|----------------------------------------------------------------------|
| **SUPER**   | Global. Only role that can manage users.                          |
| **ADMIN**   | Season-scoped, via `SeasonAdmin` join → `session.user.seasonAdminIds` |
| **LEADER**  | Group-scoped, via `GroupLeader` join → `session.user.groupLeaderIds`  |
| **MENTOR**  | Read-all-students; no write scope by default.                    |
| **STUDENT** | Owns their own submissions, profile, attendance records.         |

Use helpers in `src/lib/rbac.ts` (`isAdminOfSeason(u, seasonId)`, `isLeaderOfGroup(u, groupId)`, `canReadAllStudents(u)`, `canManageUsers(u)`) — pass the `SessionUser` and the resource id rather than re-checking roles ad hoc. Never expose data beyond the user's scope.

---

## Rules & Restrictions

### TypeScript
- **Never use `any`** — always define explicit types; reuse types generated under `src/generated/prisma/` before inventing new ones
- Strict mode is on — keep it that way
- No unused variables; prefix intentionally unused vars with `_`
- Use `const` by default; `let` only when reassignment is needed
- No `var`
- Use strict equality (`===`, never `==`)
- No `debugger` statements left in code

### Code Quality
- **No repeated code** — extract shared logic into `src/lib/`
- **No over-engineering** — solve only what is asked; do not add features, abstractions, or configurability beyond the current task
- Write clean, readable code — prefer clarity over cleverness
- Keep functions small and single-purpose
- Do not add docstrings or comments unless the logic is genuinely non-obvious

### Architecture
- API route handlers handle HTTP only — validate input (Zod), check auth/scope, call a library function, return response
- All shared business logic and DB queries belong in `src/lib/` — do not duplicate DB calls across route handlers

### Next.js (v16) Best Practices
- **Server Components by default** — only add `"use client"` when the component needs interactivity, browser APIs, or React hooks
- **Data fetching in Server Components** — fetch directly in async server components; avoid client-side fetching unless necessary
- **Route Handlers** (`src/app/api/`) are for client-initiated mutations and external integrations — not for server-to-server data fetching
- **`next/image`** — always use for images; never use raw `<img>` tags
- **`next/link`** — always use for internal navigation; never use raw `<a>` tags for same-app routes
- **`next/font`** — use for fonts to avoid layout shift
- **Layouts** — put shared UI in `layout.tsx`; do not repeat it across pages
- **Loading & error boundaries** — add `loading.tsx` and `error.tsx` per route segment where appropriate
- **Metadata** — define `metadata` exports or `generateMetadata` in page files for SEO
- **Server Actions** — prefer for form submissions and mutations called from client components; avoid creating an API route just to wrap a library call
- **Environment variables** — server-only secrets must NOT be prefixed with `NEXT_PUBLIC_`; only expose what the client genuinely needs
- **No `useEffect` for data fetching** — fetch in Server Components or use Server Actions instead
- **Base UI / shadcn hydration** — any reusable component that renders Base UI primitives (Select, Dialog, Popover, etc.) must have `'use client'` at the top of its file; omitting it causes `aria-controls` ID mismatches between SSR and client hydration

---

## Design System Compliance

Before writing ANY component, page, or UI element:

1. **Read the design system showcase page** at `/dev/design-system` (or the equivalent file in `src/app/dev/design-system/`) to remind yourself of the existing component library and tokens.
2. **Read the Tailwind theme config** (the `@theme` block in `src/app/globals.css`, or `tailwind.config.ts` if present) to confirm available tokens.
3. **Read the existing components** in `src/components/ui/` and `src/components/layout/` before creating anything new. Reuse, don't duplicate.

### Color Rules
- ONLY use design tokens: `brand-navy-*`, `brand-teal-*`, `neutral-*`, `success-*`, `warning-*`, `error-*`, `info-*`
- NEVER use raw Tailwind colors like `bg-blue-500`, `text-gray-700`, `bg-slate-100` — these are off-system
- NEVER use arbitrary color values like `bg-[#abc123]` unless explicitly approved
- Role badges must use the exact role color tokens defined in the system

### Component Rules
- NEVER create a one-off Button, Input, Card, Modal, Badge, Avatar, etc. Use the existing component from `src/components/ui/`. If it's missing a variant you need, EXTEND the component — don't fork it.
- NEVER inline styles for spacing, radii, shadows that already exist as utilities. Use `rounded-xl` not `style={{ borderRadius: 12 }}`.
- ALL modals/dialogs must use the responsive Modal component which becomes a bottom sheet on mobile. No custom modal implementations.
- ALL forms must use the existing Input/Textarea/Select/DatePicker components with React Hook Form + Zod. No raw `<input>` tags.

### Layout Rules
- ALL pages must be wrapped in AppShell. Never render outside it (except `/login` and `/forgot-password`).
- ALL navigation must come from `src/lib/navigation.ts` config — never hardcode nav items in a layout.
- ALL pages must be MOBILE-FIRST. Design and verify at 375px width FIRST, then enhance with `md:` and `lg:` breakpoints. If you find yourself writing `md:` before testing mobile, stop and restart.
- Touch targets minimum 44×44px on mobile.
- Card padding: `p-4 md:p-6`. Section gap: `gap-4 md:gap-6`. Don't deviate without reason.

### State Rules
- Every list view must have an EmptyState component for the empty case.
- Every async boundary must have a Skeleton loader matching the layout (not a spinner).
- Every action button must show a loading state during pending Server Actions.
- Every form field must show inline validation errors using the existing error pattern.

### Verification Step (REQUIRED before declaring any screen done)

After building each screen, perform this self-audit and report the results in your response:

1. **Token audit**: grep the file for hardcoded colors (`#`, `rgb(`, `bg-blue`, `bg-red`, `bg-gray`, `text-gray`, etc.). Report any findings or confirm zero violations.
2. **Component audit**: list every UI primitive used on the screen (buttons, inputs, modals, cards, badges). Confirm each comes from `src/components/ui/`.
3. **Mobile audit**: state whether you verified the screen at 375px width and confirm no horizontal scroll, no cut-off text, no unreachable buttons.
4. **State audit**: confirm loading state exists, empty state exists (if applicable), error state handled.

If any audit fails, fix it before moving on. Do not skip this step.

---

## Testing

Tests are not wired up in this repo yet. When adding the first tests:

- Place them under `__tests__/` (Vitest is the planned runner — match the conventions used by sibling Money Manager repo)
- Mock the Prisma client at `@/lib/db` — never hit the real database in tests
- Every new API route should cover: success case, access control (unauthorized / wrong role / wrong scope), invalid input / error handling
- Every new library function should have a unit test

Until the test runner is added, lean on `npm run typecheck` and `npm run lint` as the gating checks.

---

## Working with Claude

- **Use sub-agents** when tasks can be parallelised or isolated — prefer the `Explore` agent for codebase research and `Plan` agent for architectural decisions
- Before writing new code, search for existing implementations in `src/lib/` that can be reused
- Read files before editing them — understand existing patterns first
- Make targeted, minimal changes — do not refactor surrounding code unless asked
- Heed `AGENTS.md`: this is Next 16, not the Next.js in your training data — consult `node_modules/next/dist/docs/` when in doubt
