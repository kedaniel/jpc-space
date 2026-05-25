---
name: jpc-roles
description: JPC Portal role and permission rules. Use whenever creating, modifying, or reviewing any feature involving authentication, authorization, user roles, route protection, Server Actions, database queries that should be scoped by user, or UI elements that show/hide based on role. Also use when adding new routes, new Server Actions, new permission helpers, or any code that reads or writes user data. Covers the 5-role permission matrix, scope rules per role, query-layer enforcement requirements, and the privacy rules for student historical data.
---

# JPC Portal Roles & Permissions

This document is the authoritative source for who can do what in JPC Portal. 
Every feature must comply with these rules. When in doubt, default to the 
most restrictive interpretation.

## The 5 Roles

JPC Portal has exactly 5 roles. There are no other roles, and these names 
are fixed in the codebase as the `UserRole` enum.

### 1. SUPER (Global Administrator)
**Scope**: Global. Has access to everything across all seasons, all students, 
all users.

**Can:**
- Create, edit, archive, and soft-delete seasons
- Assign one or more Admins to a season
- Create, edit, and deactivate any user
- Assign roles to users
- Read everything: all seasons, all students, all submissions, all 
  attendance, all notes
- Access system-wide analytics and reports
- Bulk import students from CSV

**Cannot:**
- Bypass the soft-delete pattern (no hard deletes of Users, Seasons, or 
  Students)
- Edit submissions on behalf of students
- Mark attendance on behalf of leaders (allowed, but unusual — log it)

### 2. ADMIN (Season-Scoped)
**Scope**: Limited to seasons they are explicitly assigned to. Multiple 
Admins can be assigned to the same season with equal permissions.

**Can:**
- Read everything within their assigned season(s): students, groups, 
  leaders, submissions, attendance, notes
- Build and manage the session calendar (add, edit, reschedule, delete 
  sessions, including recurring sessions)
- Create, edit, and delete assignments
- Create, edit, and delete groups
- Assign Leaders and Students to groups within their season
- View season analytics and reports
- Create students within their season

**Cannot:**
- Access seasons they are NOT assigned to
- Create new seasons (only Super can)
- Edit season metadata (only Super can — Admin operates within an existing 
  season)
- Assign other Admins to the season (only Super can)
- Manage users globally (only Super can)
- Access any data outside their assigned season(s)

### 3. LEADER (Group-Scoped Within a Season)
**Scope**: Limited to groups they are explicitly assigned to within a 
season. Can be assigned to multiple groups.

**Can:**
- View their assigned group(s)' students
- Mark attendance for their group's students at each session
- View, review, and provide feedback on their group's assignment 
  submissions
- Add engagement notes on their group's students
- View their group's roster and engagement stats

**Cannot:**
- See students in OTHER groups within the same season
- Mark attendance for students outside their group
- View submissions from students outside their group
- Edit assignments (only Admin/Super)
- Edit the session calendar (only Admin/Super)
- Edit group composition (only Admin/Super)
- Add or edit students' profiles (only Admin/Super)

### 4. STUDENT
**Scope**: Their own profile + their current active season + read-only 
view of their previous seasons.

**Can:**
- View their current active season: curriculum, calendar, sessions, 
  assignments
- Submit assignments (text + file uploads)
- Edit their own submission BEFORE the due date
- View their own attendance record for current season
- View their own group and leaders
- View their own profile and edit specific fields (photo, contact info, 
  social handles, gifts/interests, academic info, spiritual background)
- View list of previous seasons they participated in (as read-only history)

**Cannot:**
- See submissions, grades, or detailed engagement data from PREVIOUS seasons
- See other students' profiles, submissions, or attendance
- See leader/mentor notes about themselves (these are private)
- Edit attendance records (only their leader marks attendance)
- Edit submissions AFTER the due date has passed
- Be enrolled in more than ONE active season at a time

### 5. MENTOR (Global Pastoral, Read-Only)
**Scope**: Global, read-only across all students and all seasons.

**Can:**
- View every student's profile, including full seasons history
- View all attendance records
- View all submissions (read-only, no feedback editing)
- View all engagement notes from all leaders and admins
- Add their OWN engagement notes on any student
- Flag students for follow-up
- View cross-season engagement analytics and reports

**Cannot:**
- Edit seasons, assignments, groups, attendance, or anyone else's notes
- Create or delete users, students, seasons, or any other entity
- Mark attendance on behalf of leaders
- Override student privacy controls

## Permission Helpers (lib/auth/permissions.ts)

All permission checks MUST go through the helpers in 
`lib/auth/permissions.ts`. Never write ad-hoc permission logic inline.

### Required Helpers

The following helpers exist (or must exist) and must be used:

- `requireRole(allowedRoles: UserRole[])` — Server Component / Server 
  Action guard. Throws `UnauthorizedError` if the user is not authenticated, 
  `ForbiddenError` if their role is not in the allowed list.
- `getCurrentUser()` — typed helper returning current user with role info
- `getCurrentUserOrRedirect()` — same but redirects to /login if absent
- `canAccessSeason(userId, seasonId)` — Super, season-Admin, enrolled 
  Student (current OR past), group-Leader of that season, or Mentor
- `canEditSeason(userId, seasonId)` — Super, or Admin of that season
- `canCreateSeason(userId)` — Super only
- `canAccessGroup(userId, groupId)` — Super, season-Admin, group-Leader, 
  or Mentor
- `canEditGroup(userId, groupId)` — Super, or Admin of parent season
- `canMarkAttendance(userId, sessionId)` — Super, Admin of session's 
  season, or Leader of student's group
- `canCreateAssignment(userId, seasonId)` — Super, or Admin of that season
- `canViewSubmission(userId, submissionId)` — Super, season-Admin, Leader 
  of student's group, Mentor (read), or the student themselves
- `canEditSubmission(userId, submissionId)` — only the submission's owner, 
  and only before the due date
- `canReviewSubmission(userId, submissionId)` — Super, Admin, or Leader of 
  student's group
- `canViewStudent(userId, targetStudentId)` — Super, Mentor, season-Admin 
  if student is in their season, group-Leader if student is in their group, 
  or the student themselves
- `canEditStudent(userId, targetStudentId)` — Super, season-Admin, or the 
  student themselves (with field-level restrictions)
- `canViewNotes(userId, targetStudentId)` — Super, Mentor, season-Admin, 
  group-Leader if student is in their group. Students CANNOT see notes 
  about themselves.
- `getVisibleStudents(userId)` — returns scoped student list per role:
  - SUPER, MENTOR → all students
  - ADMIN → students in their seasons
  - LEADER → students in their groups
  - STUDENT → only themselves
- `getStudentSeasonAccess(studentId, seasonId)` — returns 
  `{ canViewSubmissions: boolean, isReadOnly: boolean }` for student 
  history privacy enforcement

If a needed helper doesn't exist, ADD IT to `lib/auth/permissions.ts`. 
Never write ad-hoc permission checks inline in Server Actions or pages.

## Enforcement Rules (Critical)

### Rule 1: Permission Checks at the Server Action Layer

EVERY Server Action that reads or writes data MUST call a permission 
helper before executing. No exceptions.

```typescript
// CORRECT
'use server'
export async function updateSeason(seasonId: number, data: SeasonUpdate) {
  const user = await getCurrentUserOrRedirect()
  if (!(await canEditSeason(user.id, seasonId))) {
    throw new ForbiddenError('Cannot edit this season')
  }
  // ... proceed with update
}

// WRONG — no permission check
'use server'
export async function updateSeason(seasonId: number, data: SeasonUpdate) {
  await prisma.season.update({ where: { id: seasonId }, data })
}
```

### Rule 2: Query-Layer Scoping (NOT UI Hiding)

When showing data scoped by role, the SCOPE MUST BE ENFORCED IN THE 
DATABASE QUERY, not by filtering or hiding in the UI.

```typescript
// CORRECT — student data never leaves the database
const students = await prisma.student.findMany({
  where: {
    enrollments: {
      some: {
        group: {
          leaders: {
            some: { userId: currentUser.id }
          }
        }
      }
    }
  }
})

// WRONG — student data is fetched then filtered client-side
const allStudents = await prisma.student.findMany()
const visibleStudents = allStudents.filter(s => isInLeadersGroup(s, user))
```

The wrong pattern leaks data through the network response, even if the UI 
hides it. A clever user can inspect network calls and see students they 
shouldn't.

### Rule 3: Student "Previous Seasons" Privacy

When a Student views a previous season they participated in, the response 
MUST NOT contain:
- Their submissions or submission files
- Feedback or grades on those submissions
- Engagement notes about them
- Attendance details beyond aggregate stats

This is enforced at the query layer via `getStudentSeasonAccess`. The 
helper returns `{ canViewSubmissions: false, isReadOnly: true }` for past 
seasons. Queries for past-season views MUST check this flag and exclude 
the relevant fields from `select` or `include`.

```typescript
// CORRECT — past-season query excludes private fields
const access = await getStudentSeasonAccess(student.id, season.id)
const sessions = await prisma.session.findMany({
  where: { seasonId: season.id },
  select: {
    id: true,
    title: true,
    date: true,
    // Conditionally include only if current season
    ...(access.canViewSubmissions ? {
      submissions: { where: { studentId: student.id } }
    } : {})
  }
})
```

### Rule 4: Field-Level Permissions on Student Profile Edits

When a Student edits their own profile:
- They CAN edit: photo, preferred name, contact info, social handles, 
  gifts/interests, academic info (university, faculty, year), spiritual 
  background fields
- They CANNOT edit: notes from leaders/mentors (read-only and HIDDEN 
  from student view entirely)
- They CANNOT edit: their email if it's used for authentication (changes 
  go through Super)
- They CANNOT change their own role

Enforce field-level permissions in the Server Action's Zod schema by 
omitting forbidden fields entirely:

```typescript
// CORRECT — Student schema explicitly excludes notes and role
const studentSelfEditSchema = z.object({
  preferredName: z.string().optional(),
  phone: z.string().optional(),
  university: z.string().optional(),
  // ... only allowed fields
  // NOTE: no notes, no role, no leaderNotes
})
```

### Rule 5: Mentor Cannot Write Anywhere Except Their Own Notes

The Mentor role is the easiest to get wrong because it has GLOBAL READ. 
It's tempting to give it more permissions "since they can already see 
everything." Don't.

Mentor can ONLY write to:
- Their own engagement notes (one note per record, edit-only-own)
- Their own profile
- Follow-up flags (a separate field, mentor-owned)

Mentor CANNOT:
- Edit other mentors' or leaders' notes
- Mark attendance
- Grade submissions
- Edit student profiles
- Edit any season, group, assignment, or session

### Rule 6: Active Season Constraint

A student is enrolled in exactly ONE active season at a time. When 
creating a new enrollment:

1. Check if the student has an existing active enrollment
2. If yes, that enrollment must be marked as `status: COMPLETED` or 
   `status: WITHDRAWN` before the new one can be created
3. Enforce at both the application layer (Zod validation + Server Action) 
   AND the database layer (partial unique index on `(studentId, status)` 
   where status = 'ACTIVE')

## Route Protection (Middleware)

`middleware.ts` enforces role-based route groups:

- `/super/*` — SUPER only
- `/admin/*` — SUPER or ADMIN
- `/leader/*` — SUPER, ADMIN, or LEADER
- `/student/*` — SUPER or STUDENT (Super for inspection, Student for own)
- `/mentor/*` — SUPER or MENTOR
- Public: `/login`, `/forgot-password`, `/api/auth/*`

Unauthenticated → redirect to `/login`. Wrong role → 403 page.

The middleware is a defense-in-depth layer. Permission helpers in Server 
Components and Server Actions are STILL required even on protected routes.

## Self-Audit Checklist for Role-Related Code

Before declaring any feature with role implications done, verify:

1. **Server Action audit**: Every new Server Action calls a permission 
   helper from `lib/auth/permissions.ts`. Grep with:
   `grep -rE "^export async function|^'use server'" app/ --include="*.ts"` 
   then verify each one has a `requireRole` or `can*` check.

2. **Query scope audit**: Every database query that returns scoped data 
   uses a WHERE clause based on the user's role context. No 
   `prisma.X.findMany()` without a scope filter (except for SUPER and 
   MENTOR contexts which are global by design).

3. **UI vs query audit**: If a list is "hidden" for certain roles, 
   confirm the data isn't even in the network response. Open browser 
   devtools, inspect the response payload, confirm only authorized 
   records are present.

4. **Past-season privacy audit**: If implementing any student-history 
   view, confirm submissions/notes are excluded from the query's 
   `select` or `include` clauses, not just hidden in the JSX.

5. **Mentor write-permission audit**: If implementing a write operation 
   on student data, confirm Mentor is excluded from the permission 
   helper. Mentor reads, never writes (except their own notes).

6. **Route group audit**: New routes are placed under the correct role 
   group folder (`app/super/`, `app/admin/`, etc.) and middleware 
   correctly enforces access.

## Common Mistakes to Avoid

- **Hiding data in the UI instead of filtering at query layer** — security 
  failure
- **Using `prisma.X.findMany()` without role scope** — accidental data leak
- **Hard-coding role names as strings instead of using the UserRole enum** — 
  refactor hazard
- **Letting Mentor write to anything other than their own notes** — role 
  inflation
- **Forgetting to enforce field-level edit permissions on student profile** — 
  notes leak
- **Creating ad-hoc permission checks inline instead of using helpers** — 
  inconsistency, security gaps
- **Returning past-season submissions to students** — privacy violation, 
  even if hidden in UI

## When This Skill Should Trigger

This skill auto-loads on tasks involving:
- Adding or modifying any route under `app/[role]/*`
- Writing or modifying any Server Action
- Writing or modifying any Prisma query that returns user data
- Modifying `lib/auth/permissions.ts`
- Modifying `middleware.ts`
- Implementing any UI element that shows/hides based on role
- Adding to `prisma/schema.prisma` (to consider role implications)
- Implementing student profile, submission, attendance, or notes features
- Implementing any feature where the description mentions "Super", 
  "Admin", "Leader", "Student", or "Mentor"

If you're touching any of the above and this skill didn't auto-trigger, 
re-read it explicitly before continuing.
