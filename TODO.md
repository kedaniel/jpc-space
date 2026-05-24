# MVP follow-ups

Items intentionally deferred from the MVP build. Track these as separate PRs.

## Deferred from initial scope

- **CSV bulk import of students** (Stage I). User-management create flow is single-user only. Plan: file upload → preview parsed rows → confirm import → generate invite tokens (reuse `src/lib/invites.ts`) instead of pre-set passwords.
- **Showcase new primitives** in `src/app/dev/design-system/page.tsx`: `MultiSelect`, `Combobox`, `ChipInput`, `RichTextEditor` / `RichTextView`, chart wrappers, `NotificationBell`.
- **Per-role `/notifications` "View all" pages** — bell links there but the route doesn't exist yet; add in Stage H.
- **Server-side rich-text sanitization tests** — `RichTextView` sanitizes via `isomorphic-dompurify`. Once test infra exists, cover: script tags stripped, iframe stripped, allowed tags preserved, on-event attrs stripped.
- **Real test infra** (Vitest) — pin Prisma mock, cover permission helpers, history privacy, notification fan-out.

- **Submission file download** — the review screen lists attachments but doesn't serve them yet. Add a `/api/files/[id]/route.ts` GET handler that calls `getStorage().get(path)` and streams to the response, gated by `canViewSubmission`.

## Tech debt / known issues

- Recharts colors are hex literals mirrored from `globals.css` in `src/lib/chart-colors.ts`. If the design token palette changes, update both files. A long-term fix is to render charts client-side and read `getComputedStyle` for CSS variables.
- PDF export will use `pdf-lib` with a plain header + table layout — not a designed report. A polished version would render to HTML and use a headless-browser renderer.
- Notification fan-out for assignment creation uses a single `createMany`. Fine at seed sizes (≤30 students/season); revisit if real cohorts exceed a few hundred.
- No pagination on DataTables in this pass. Add server-side pagination if real-world data outgrows the seed sizes.
