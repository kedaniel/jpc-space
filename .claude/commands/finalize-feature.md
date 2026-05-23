Finalize the current feature branch before opening a pull request.

Work through the following steps in order:

## 1. Identify what changed
- Run `git diff main...HEAD --name-only` to list all changed files
- Summarize the feature: what was added, changed, or removed

## 2. Update help and docs
- Check if any user-facing behaviour changed (new pages, API endpoints, form fields, permissions, etc.)
- If yes, locate and update relevant help text, tooltips, or documentation files (e.g. `docs/`, in-app help components)
- Update `CLAUDE.md` if conventions or architecture changed in a way future contributors should know

## 3. Add missing test cases
- Review all new or modified files from step 1
- For each new API route handler (`src/app/api/`): ensure there are tests covering:
  - [ ] Success case
  - [ ] Unauthorized / access control (SUPER, ADMIN of season, LEADER of group, MENTOR, STUDENT where relevant)
  - [ ] Invalid input / error handling (Zod parse failures)
- For each new library function (`src/lib/`): ensure unit tests exist
- For each new component with logic: ensure behaviour is tested
- Write any missing tests in `__tests__/` using Vitest, mocking Prisma at `@/lib/db`
- Follow the existing test file naming convention

> If the test runner is not yet wired up in this repo, skip this step and rely on typecheck + lint + manual verification instead — note this explicitly in the PR.

## 4. Run tests
- Run `npm run test:run` (skip if no test runner is configured yet)
- If any tests fail, fix them before proceeding
- Report the final test results (passed / failed / skipped)

## 5. Run lint and typecheck
- Run `npm run lint` and fix any errors
- Run `npm run typecheck` and fix any errors

## 6. Run build
- Run `npm run build`
- Fix any TypeScript or build errors before proceeding

## 7. Database checks
- If `prisma/schema.prisma` was modified:
  - Confirm the user has approved the schema change (per the review-gate comment in the schema header)
  - Confirm `npx prisma migrate dev` was run and the new migration committed under `prisma/migrations/`
  - Confirm `npm run db:generate` produced an up-to-date client under `src/generated/prisma/`

## 8. Final checklist

Confirm all of the following before declaring the feature ready:

- [ ] No `any` types introduced
- [ ] Soft deletes used on `User` / `Season` / `StudentProfile` / `Assignment` (no hard deletes)
- [ ] `createdById` / `updatedById` populated on mutations to `Season` / `Assignment` / `Submission`
- [ ] Access control applied correctly (SUPER global / ADMIN season-scoped / LEADER group-scoped / MENTOR read-only / STUDENT self-only)
- [ ] Prisma client imported from `@/generated/prisma/*`, not `@prisma/client`
- [ ] `db` singleton from `@/lib/db` used — no ad hoc `new PrismaClient()`
- [ ] No DB logic duplicated outside `src/lib/`
- [ ] `"use client"` added to any component that renders Base UI primitives
- [ ] `next/image` / `next/link` / `next/font` used where applicable
- [ ] Help/docs/CLAUDE.md updated if behaviour or conventions changed
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Tests pass (if test runner is configured)
- [ ] No `debugger`, no unused vars, no `var`

---

Once all steps pass, the feature is ready for a pull request.
