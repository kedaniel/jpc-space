# Architectural decisions — JPC Space

This doc captures the non-obvious choices behind the schema and project setup. The README has the *what*; this has the *why*.

## 1. `Int` primary keys, not `BigInt`

The brief mentioned `BIGSERIAL`, but `@id @default(autoincrement())` in Prisma maps to `serial4` (PostgreSQL int4). We kept it as `Int`:

- ~2 billion rows is wildly beyond this app's scale (a few thousand users, tens of thousands of submissions).
- `int4` indexes are **half the size** of `int8` — directly aligned with the "smaller indexes" benefit cited in the brief.
- JS `BigInt` ergonomics are awkward: literals, JSON serialization, math operators all need special handling.

Switch to `BigInt` is a search-and-replace if scale ever demands it.

## 2. Active season modeled two ways

`StudentProfile.activeSeasonId` is a **denormalized hot-path FK** for "what season is this student currently in?" — the answer most queries need first. The append-only `SeasonEnrollment` table preserves the *full* history (every season they were ever in, including the current one).

Rules:
- `activeSeasonId` is `SET NULL` on Season delete (clears the cache; history is preserved elsewhere).
- `SeasonEnrollment` is `RESTRICT` on both Season and User — history is sacred.
- The seed always writes both (activeSeasonId AND a matching `ACTIVE` SeasonEnrollment).
- Business logic, not the DB, keeps them in sync on transitions.

The chosen tradeoff: a tiny bit of duplication, but every "is this student current?" query is a single column read, and historical reporting joins directly off `SeasonEnrollment` without hitting profile.

## 3. Recurring sessions are materialized

Each occurrence is its own `Session` row. Siblings created in the same batch share a `recurrenceGroupId` (uuid). Chosen over storing an RRULE because:

- Course calendars are short (~8–16 sessions) — storage is trivial.
- Attendance lives on `(sessionId, studentUserId)` — no need to lazy-materialize when someone marks attendance.
- Assignments link to a specific `sessionId` — much simpler with concrete rows.
- Editing a single occurrence (different room, different time) is just an `UPDATE` on one row.

## 4. URL identifier strategy (per-entity)

Verbatim from the brief — applied per entity:

| Entity | URL identifier | Why |
|---|---|---|
| Season | `code` (slug) | Human-readable, natural |
| Group / Student / Session / Assignment / User | sequential `id` | Internal tool, RBAC enforced on every route |
| Submission | `publicId` (nanoid 10) | Most sensitive — feedback, files; unguessable |
| EngagementNote, Attendance | not in URLs | Embedded in parent pages |

`newPublicId()` ([src/lib/public-id.ts](src/lib/public-id.ts)) uses a 62-char alphabet (digits + ASCII letters) → ~8.4 × 10¹⁷ search space. `Season.code` is enforced lowercase, ASCII, hyphenated via [src/lib/slug.ts](src/lib/slug.ts).

## 5. Multi-role users

Every `User` has a global base `role`. **Scoped** Admin/Leader assignments live in `SeasonAdmin` and `GroupLeader` join tables. A user can be:

- Base STUDENT and also Leader of a later season's group (no role change required).
- Base ADMIN and also assigned to multiple seasons (rows in `SeasonAdmin`).

RBAC checks consult both: e.g., "can read this season" = `SUPER || MENTOR || base-Admin-with-row-in-SeasonAdmin || base-Leader-with-group-in-that-season`. The session JWT carries `seasonAdminIds` and `groupLeaderIds` so most checks are array-includes.

## 6. Invite-only credentials auth, JWT sessions

- `User.passwordHash` is **nullable** — set only when the user accepts their invite. Sign-in is blocked while null.
- `InviteToken` is single-use, time-limited (`INVITE_TOKEN_TTL_HOURS`, default 72).
- Session strategy is **JWT**, not database, so RBAC scope arrays (`seasonAdminIds`, `groupLeaderIds`) can be embedded and read on every request without a DB hit. Scopes are reloaded on `signIn` and `update`.

## 7. Cascade choices

Children of "owned" relationships CASCADE; references that imply history RESTRICT; nullable optional references SET NULL.

| Edge | Behavior | Why |
|---|---|---|
| `SubmissionFile → Submission` | CASCADE | Files meaningless without submission |
| `Attendance → Session` | CASCADE | |
| `AssignmentTarget → Assignment` | CASCADE | |
| `Group → Season` | RESTRICT | Don't silently delete a course's groups |
| `GroupLeader/GroupStudent → User` | RESTRICT | Membership history is meaningful |
| `SeasonEnrollment → Season/User` | RESTRICT | Append-only history |
| `StudentProfile.activeSeasonId → Season` | SET NULL | Profile survives, cache cleared |
| Audit FKs (`createdById`, etc.) → User | SET NULL | User soft-delete preserves attribution intent |

## 8. Soft-delete policy

- `deletedAt` on `User`, `Season`, `StudentProfile`, `Assignment`.
- Auth `authorize` rejects `deletedAt != null` users.
- All read queries should filter `deletedAt: null` (helpers will be added when query layer is built).
- **Hard delete** for: tokens, attendance rows, submission files (when removing), join tables (when reassigning), engagement notes.

## 9. `GroupStudent.studentUserId` is uniquely indexed

The student↔group relation is many-to-one in practice (a student is in exactly one current group). Making `studentUserId` unique standalone (in addition to the composite PK) **enforces "one current group per student" as a DB invariant** — no business-logic enforcement needed.

Past memberships live in `SeasonEnrollment`.

## 10. Storage abstraction

`src/lib/storage/` exposes a `Storage` interface with `put / get / delete / url`. Two drivers:

- **`LocalFsStorage`** — writes under `./uploads/<bucket>/YYYY/MM/<publicId>-<safeName>`. `url()` returns `/api/uploads/<path>` for a route handler we'll add in the UI phase.
- **`S3Storage`** — stubbed; drop `@aws-sdk/client-s3` calls in when production is wired.

Driver picked from `STORAGE_DRIVER` (`local` | `s3`).

## 11. Prisma 7 + adapter pattern

Prisma 7 removed `url = env(...)` from the schema. Instead:

- `prisma.config.ts` holds the migration-time `DATABASE_URL`.
- The runtime `PrismaClient` is constructed with `adapter: new PrismaPg({ connectionString })` — see [src/lib/db.ts](src/lib/db.ts).

This is the new standard pattern. It also gives us a clean path to swap to `@prisma/adapter-neon` (websocket-based, serverless-friendly) if/when we deploy on Vercel + Neon.

## 12. Prisma client output location

Generator outputs to `src/generated/prisma/` (gitignored) rather than `@prisma/client`. This is the Prisma 7 default with the new `prisma-client` generator and is the recommended setup going forward.

Import as `from "@/generated/prisma/client"` (Prisma client) or `from "@/generated/prisma/enums"` (enums like `UserRole`).

## 13. Next.js 16 instead of 15

`create-next-app@latest` ships Next 16.2.6 stable as of seeding time. App Router, Server Actions, and Turbopack defaults are unchanged from 15. No code changes required to drop back to 15 if desired.
