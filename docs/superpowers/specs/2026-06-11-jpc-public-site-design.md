# JPC Public Site + Application System — Design Spec

**Goal:** Build a public-facing JPC homepage within the existing Next.js app, alongside an online application system that replaces the current Google Form, and an admin review workflow that creates accounts and enrolls approved applicants in The Way season.

**Phase:** 1 of 2. Phase 2 (ALUMNI role + alumni hub) is a separate spec to follow.

---

## Architecture

The public site lives as a `(public)` route group inside `src/app/`. This gives it a dedicated layout (public navbar + footer) with no AppShell, no auth required. The root `/` is replaced by the public homepage.

```
src/app/
  (public)/
    layout.tsx          ← public navbar + footer, no AppShell
    page.tsx            ← / (public homepage)
    apply/
      page.tsx          ← /apply (application form)
    news/
      [id]/
        page.tsx        ← /news/:id (post detail)
  page.tsx              ← REMOVED (was a redirect; (public)/page.tsx takes over /)
```

Authenticated users visiting `/` see a "Go to Dashboard →" button in the navbar instead of "Login". Unauthenticated visitors see the full public homepage.

The current `/login`, `/forgot-password`, and `/reset-password` routes are unchanged.

---

## Public Navbar

- JPC logo (left)
- Language toggle button `AR | EN` (right, switches entire page direction)
- Login button (unauthenticated) or "Dashboard →" link (authenticated)
- Mobile: hamburger collapses to drawer with the same items
- Sticky on scroll

---

## Homepage Sections (in order)

### 1. Hero
- Full-bleed dark navy background with subtle geometric pattern
- JPC logo centered or left-aligned
- Headline + subheadline in both Arabic and English (stacked, language toggle shows/hides each)
- Two CTAs: **"Apply Now"** (teal button → `/apply`) and **"Learn More ↓"** (scroll anchor)
- Mobile: single column, reduced padding

### 2. Mission & Vision
- Two equal cards side by side (stacks on mobile)
- Each has a small icon, bold title ("Our Mission" / "Our Vision"), body text in both languages
- Text is static — hardcoded in the component, bilingual strings defined in a local i18n object

### 3. Programs
- Three cards showing the JPC journey: **The Way → GBV → 3G**
- Each card: program name (bilingual), one-sentence description (bilingual), a subtle step number
- Visual progression arrow between cards (desktop) or numbered list (mobile)
- Purpose: help visitors understand the full arc before applying

### 4. News & Updates
- Heading "News & Updates" with "View all →" link (links to a future news list page; for now just shows cards)
- Latest 3 published `JpcPost` records, sorted by `publishedAt` desc
- Each card: cover image (16:9, `next/image`), title, publish date, short body excerpt
- If no posts exist yet: empty state (no section rendered)

### 5. How to Join
- Dark teal section background (distinct visual break)
- Heading "How to Join" (bilingual)
- 4 numbered steps: Apply → Review → Acceptance email → Start The Way
- Large "Apply Now →" button

### 6. Newsletter Signup
- Single email input + "Subscribe" button
- On submit: POST `/api/newsletter/subscribe` → creates `NewsletterSubscriber` record
- Duplicate email shows a friendly "You're already subscribed" message (not an error)
- Success shows inline confirmation, no page navigation

### 7. Footer
- JPC logo, copyright year
- Social links (Instagram, Facebook) — URLs hardcoded as env vars `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_FACEBOOK_URL`
- Contact email link

---

## Apply Page (`/apply`)

### Language toggle
- Prominent `AR | EN` toggle at top of form
- Switching language re-renders all field labels, placeholders, and error messages in the target language
- Sets `dir="rtl"` on the form wrapper when Arabic is active
- Field values are NOT cleared when toggling — only UI strings change

### Form fields
All fields are required unless noted:

| Field | Type | Notes |
|-------|------|-------|
| Full name | text | |
| Email | email | Validated format |
| Phone | tel | |
| Date of birth | date | |
| University | text | |
| Year of study | select | 1st–6th year + Graduate |
| Photo | file | Optional. JPEG/PNG, max 5 MB. Uploaded to storage via `src/lib/storage/` |
| Spiritual background / testimony | textarea | |
| Why do you want to join JPC? | textarea | |
| How did you hear about us? | select | Friend, Social media, Event, Church, Other |

### Submission
- Client-side validation with React Hook Form + Zod
- On submit: POST `/api/applications` (multipart form data for photo upload)
- Creates `Application` record with `status=PENDING`
- If email already has a PENDING or APPROVED application: return 409, show "An application already exists for this email."
- Success: replace form with a thank-you message (no redirect)

---

## Admin Review UI (`/admin/applications`)

Accessible to: **SUPER** (all applications) and **ADMIN** (applications where `targetSeasonId` is in their `seasonAdminIds`).

Added to admin navigation as "Applications" with a badge showing pending count.

### List view
- Table/list of applications, default filter: PENDING
- Columns: name, email, submitted date, status badge
- Filter tabs: All / Pending / Approved / Rejected
- Click row → opens detail panel (slide-over or separate page)

### Detail view
- All form fields displayed read-only
- Photo preview if uploaded
- Status badge
- Two action buttons (only shown when status=PENDING):
  - **Approve** (opens a small confirmation modal)
  - **Reject** (opens a modal with optional `rejectionNote` textarea)

### Approve action
POST `/api/applications/[id]/approve`:
1. Validate: application must be PENDING; user must be authorized
2. In a DB transaction:
   - Find the active "The Way" season (first Season with `status=ACTIVE` and `title` containing "The Way" — or `code` containing "the-way"; admin picks if multiple)
   - Create `User` (`role=STUDENT`, no `passwordHash` yet, `name=application.fullName`, `email=application.email`)
   - Create `SeasonEnrollment` (`studentUserId`, `seasonId`, `status=ACTIVE`)
   - Create `StudentProfile` (`userId`)
   - Call `createInvite(newUserId, reviewerId)` from `src/lib/invites.ts`
   - Mark `Application.status=APPROVED`, set `reviewedById`, `reviewedAt`
3. Send welcome email via `src/lib/email.ts` containing the invite link
4. Return 200

### Reject action
POST `/api/applications/[id]/reject` (body: `{ rejectionNote?: string }`):
1. Mark `Application.status=REJECTED`, set `reviewedById`, `reviewedAt`, `rejectionNote`
2. Optionally send rejection email (if `SEND_REJECTION_EMAILS=true` env var)
3. Return 200

---

## Email Service (`src/lib/email.ts`)

Uses the `resend` npm package. Required env vars:
- `RESEND_API_KEY` — Resend API key
- `FROM_EMAIL` — sender address (e.g. `noreply@jpcspace.com`)

Exported functions:
- `sendWelcomeEmail(to: string, name: string, inviteUrl: string): Promise<void>`
- `sendRejectionEmail(to: string, name: string, note?: string): Promise<void>`
- `sendNewsletterConfirmation(to: string): Promise<void>`

All functions log errors but do not throw — email failure must not break the approval transaction.

---

## New Library (`src/lib/applications.ts`)

Business logic extracted from route handlers:
- `createApplication(data: ApplicationInput, photoFile?: File): Promise<Application>`
- `approveApplication(id: number, reviewerId: number): Promise<{ userId: number }>`
- `rejectApplication(id: number, reviewerId: number, note?: string): Promise<void>`
- `listApplications(filters: { status?: ApplicationStatus, seasonId?: number }): Promise<Application[]>`

---

## Schema Additions

New migration: `add-public-site-models`

```prisma
enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

model Application {
  id                  Int               @id @default(autoincrement())
  fullName            String
  email               String
  phone               String
  dateOfBirth         DateTime
  university          String
  yearOfStudy         String
  spiritualBackground String
  whyJoin             String
  howHeard            String
  photoPath           String?
  status              ApplicationStatus @default(PENDING)
  targetSeasonId      Int?
  targetSeason        Season?           @relation(fields: [targetSeasonId], references: [id], onDelete: SetNull)
  reviewedById        Int?
  reviewedBy          User?             @relation("ApplicationReviewedBy", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt          DateTime?
  rejectionNote       String?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([status])
  @@index([email])
}

enum PostStatus {
  DRAFT
  PUBLISHED
}

model JpcPost {
  id             Int        @id @default(autoincrement())
  title          String
  titleAr        String?
  body           String
  bodyAr         String?
  coverImagePath String?
  status         PostStatus @default(DRAFT)
  publishedAt    DateTime?
  createdById    Int?
  createdBy      User?      @relation("JpcPostCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([status, publishedAt])
}

model NewsletterSubscriber {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  subscribedAt DateTime @default(now())
}
```

Back-relations to add on `User`:
- `applicationsReviewed Application[] @relation("ApplicationReviewedBy")`
- `jpcPostsCreated JpcPost[] @relation("JpcPostCreatedBy")`

Back-relation to add on `Season`:
- `applications Application[]`

---

## Navigation Changes

`src/lib/navigation.ts` — add to ADMIN nav:
```ts
{ label: "Applications", href: "/admin/applications", icon: ClipboardList }
```

Shown with a numeric badge for pending applications count (fetched in the nav item component).

---

## Design Tokens

Public site uses the same Tailwind tokens as the portal (`brand-navy-*`, `brand-teal-*`, `neutral-*`) but composes them differently — full-bleed sections, editorial typography, larger whitespace. No bento tiles. No AppShell chrome.

---

## Out of Scope (Phase 2)

- ALUMNI role + alumni hub portal
- JpcPost management UI (creating/editing posts — admin panel)
- Newsletter send/broadcast (subscriber list management)
- Application form additional fields (user noted more fields will be added later)
