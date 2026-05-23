Initialize a new feature branch for this project.

Ask the user: "What is the feature name? (e.g. 'add season export')"

Then do the following steps:

## 1. Verify git state
- Run `git status` to check for uncommitted changes
- If the working tree is not clean, warn the user and stop — do not proceed until they commit or stash their changes
- Run `git checkout main && git pull origin main` to ensure we start from the latest main

## 2. Create and checkout branch
- Convert the feature name to kebab-case (lowercase, spaces → hyphens, remove special chars)
- Create and checkout the branch: `git checkout -b feat/<kebab-name>`
- Confirm the branch was created successfully

## 3. Pre-flight checks
- Run `npm install` to ensure dependencies are up to date
- Run `npm run lint` and report any errors — the user should fix lint errors before starting work
- Run `npm run typecheck` and report any errors

## 4. Print the clean-code checklist

Print the following checklist so the user keeps it in mind while working:

---

### JPC Portal — Clean Code Checklist

**TypeScript**
- [ ] Never use `any` — always define explicit types
- [ ] Reuse generated Prisma types from `@/generated/prisma/*`
- [ ] No unused variables (prefix with `_` if intentionally unused)
- [ ] No `var` — use `const` by default, `let` only when reassignment is needed
- [ ] Use strict equality (`===`, not `==`)
- [ ] No `debugger` statements

**Data & Database**
- [ ] Soft-delete only on `User`, `Season`, `StudentProfile`, `Assignment` — set `deletedAt`, never hard delete
- [ ] Schema changes use `prisma migrate dev` — and require user approval before running (see schema header)
- [ ] Import Prisma client from `@/generated/prisma/*`, never from `@prisma/client`
- [ ] Use the `db` singleton from `@/lib/db` — do not instantiate `PrismaClient` directly
- [ ] Populate `createdById` / `updatedById` on every create/update of `Season`, `Assignment`, `Submission`
- [ ] Reuse helpers in `src/lib/` — do not duplicate DB logic inside route handlers

**Access Control** (apply to every query and mutation)
- [ ] **SUPER** — global; only role that can manage users
- [ ] **ADMIN** — season-scoped via `session.user.seasonAdminIds`; use `isAdminOfSeason(u, seasonId)`
- [ ] **LEADER** — group-scoped via `session.user.groupLeaderIds`; use `isLeaderOfGroup(u, groupId)`
- [ ] **MENTOR** — read-all-students, no write scope by default
- [ ] **STUDENT** — owns own submissions / profile / attendance only

**URLs**
- [ ] `Season` is identified in URLs by `code` (slug), `Submission` by `publicId` (nanoid)
- [ ] All other entities use the integer `id`

**Next.js 16**
- [ ] Server Components by default — only add `"use client"` when needed
- [ ] Prefer Server Actions for mutations from client components
- [ ] Reusable components that render Base UI primitives must have `"use client"` to avoid hydration mismatches
- [ ] Use `next/image`, `next/link`, `next/font` — no raw `<img>` / `<a>` / web fonts
- [ ] When unsure about an API, check `node_modules/next/dist/docs/` (this is Next 16)

**General**
- [ ] Avoid over-engineering — minimum complexity for the current task
- [ ] No features, refactors, or cleanup beyond what was asked

---

You are ready to start. Good luck!
