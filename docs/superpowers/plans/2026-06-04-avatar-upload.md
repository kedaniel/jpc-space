# Avatar Upload + Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students upload a profile photo from their profile page, serve it via a new `/api/uploads` route, and display it in the student roster.

**Architecture:** `User.avatarPath` already exists in the Prisma schema. `LocalFsStorage.url()` already returns `/api/uploads/${path}`. The only missing pieces are: the file-serving route handler, a server action to write the path, upload UI in the student profile page, and wiring `AvatarImage` in `StudentsList`. No schema migration needed.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Server Actions, existing `Storage` interface (`src/lib/storage/`), Base UI Avatar component.

> **No test runner yet** — use `npm run typecheck` as the gating check after each task.

---

## File Map

**Create:**
- `src/app/api/uploads/[...path]/route.ts` — GET handler streaming stored files
- `src/components/students/avatar-upload.tsx` — client component with file picker + preview

**Modify:**
- `src/lib/user-actions.ts` (or create if not present) — add `updateAvatarAction`
- `src/app/student/profile/page.tsx` — add avatar section above the form
- `src/lib/students-query.ts` — add `avatarPath` to `StudentListRow`
- `src/components/students/students-list.tsx` — wire `AvatarImage`

---

### Task 1: Create the uploads route handler

**Files:**
- Create: `src/app/api/uploads/[...path]/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/uploads/[...path]/route.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";

interface Params {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  const storagePath = path.join("/");

  const storage = getStorage();
  const stream = await storage.get(storagePath).catch(() => null);
  if (!stream) return new NextResponse("Not found", { status: 404 });

  // Detect MIME type from extension
  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";

  const nodeReadable = stream;
  const webStream = Readable.toWeb(nodeReadable) as ReadableStream;

  return new NextResponse(webStream, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
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
git add src/app/api/uploads/
git commit -m "feat(storage): add /api/uploads route handler"
```

---

### Task 2: Add updateAvatarAction server action

**Files:**
- Modify or create: `src/lib/user-actions.ts`

- [ ] **Step 1: Check if user-actions.ts exists**

```bash
ls /workspaces/jpc-space/src/lib/user-actions.ts 2>/dev/null || echo "does not exist"
```

- [ ] **Step 2: Add the action**

If the file does not exist, create `src/lib/user-actions.ts`. If it exists, append to it.

```ts
"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { getStorage, buildStorageKey } from "@/lib/storage";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function updateAvatarAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "No file provided" };
  if (!ALLOWED_MIME.includes(file.type)) return { error: "File must be JPEG, PNG, or WebP" };
  if (file.size > MAX_BYTES) return { error: "File must be under 5 MB" };

  const ext = file.type.split("/")[1] ?? "jpg";
  const key = buildStorageKey({
    bucket: "avatars",
    publicId: String(user.userId),
    originalName: `avatar.${ext}`,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const { path } = await storage.put(key, buffer, { mime: file.type });

  await db.user.update({
    where: { id: user.userId },
    data: { avatarPath: path },
  });

  revalidatePath("/student/profile");
  return { success: true };
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/user-actions.ts
git commit -m "feat(avatar): add updateAvatarAction server action"
```

---

### Task 3: Create AvatarUpload client component

**Files:**
- Create: `src/components/students/avatar-upload.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/students/avatar-upload.tsx`:

```tsx
"use client";

import * as React from "react";
import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateAvatarAction } from "@/lib/user-actions";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  initials: string;
}

export function AvatarUpload({ currentAvatarUrl, initials }: AvatarUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(currentAvatarUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Must be JPEG, PNG, or WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    handleUpload(file);
  }

  async function handleUpload(file: File) {
    setPending(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const result = await updateAvatarAction(fd);
    setPending(false);
    if (result && "error" in result) setError(result.error);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar size="xl">
          {preview && <AvatarImage src={preview} alt="Profile photo" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <span className="text-xs text-white">Saving…</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        <Camera className="size-4 mr-1.5" />
        Upload photo
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-error-500">{error}</p>}
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
git add src/components/students/avatar-upload.tsx
git commit -m "feat(avatar): add AvatarUpload client component"
```

---

### Task 4: Add avatar upload to student profile page

**Files:**
- Modify: `src/app/student/profile/page.tsx`

- [ ] **Step 1: Update the profile page**

The page needs to fetch `avatarPath`, compute the URL, and render `AvatarUpload` above the form. Replace the file entirely:

```tsx
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { getStorage } from "@/lib/storage";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StudentForm } from "@/components/students/student-form";
import { AvatarUpload } from "@/components/students/avatar-upload";

export const metadata = { title: "My profile" };

function initialsFor(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default async function StudentProfilePage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["STUDENT"]);

  const userRow = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      email: true,
      avatarPath: true,
      studentProfile: {
        select: {
          university: true,
          year: true,
          phone: true,
          dateOfBirth: true,
          spiritualBackground: true,
          gifts: true,
          activeSeasonId: true,
        },
      },
    },
  });
  if (!userRow || !userRow.studentProfile) redirect("/student/dashboard");

  const storage = getStorage();
  const avatarUrl = userRow.avatarPath ? await storage.url(userRow.avatarPath) : null;
  const initials = initialsFor(userRow.name, userRow.email);

  return (
    <>
      <PageHeader
        title="My profile"
        description="Update your contact details, academic info, and faith background."
      />
      <Card>
        <CardContent className="pt-6 flex flex-col gap-6">
          <div className="flex justify-center">
            <AvatarUpload currentAvatarUrl={avatarUrl} initials={initials} />
          </div>
          <StudentForm
            mode="edit"
            studentUserId={user.userId}
            isSelf
            seasons={[]}
            redirectTo="/student/profile"
            defaultValues={{
              name: userRow.name ?? "",
              email: userRow.email,
              university: userRow.studentProfile.university,
              year: userRow.studentProfile.year,
              phone: userRow.studentProfile.phone,
              dateOfBirth: userRow.studentProfile.dateOfBirth,
              spiritualBackground: userRow.studentProfile.spiritualBackground,
              gifts: userRow.studentProfile.gifts,
              notes: null,
              activeSeasonId: userRow.studentProfile.activeSeasonId,
            }}
          />
        </CardContent>
      </Card>
    </>
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
git add src/app/student/profile/page.tsx
git commit -m "feat(avatar): add avatar upload section to student profile page"
```

---

### Task 5: Add avatarPath to StudentListRow and wire AvatarImage in StudentsList

**Files:**
- Modify: `src/lib/students-query.ts`
- Modify: `src/components/students/students-list.tsx`

- [ ] **Step 1: Add avatarPath to StudentListRow interface**

In `src/lib/students-query.ts`, update the `StudentListRow` interface:

```ts
export interface StudentListRow {
  id: number;
  name: string | null;
  email: string;
  university: string | null;
  year: string | null;
  photoPath: string | null;
  avatarPath: string | null;
  activeSeasonTitle: string | null;
  groupName: string | null;
}
```

- [ ] **Step 2: Add avatarPath to the Prisma select in listStudentsForScope**

In `listStudentsForScope`, find the `select` block for the user and add `avatarPath: true`. The select currently looks like:

```ts
select: {
  id: true,
  name: true,
  email: true,
  // ...
  studentProfile: { select: { ... } },
}
```

Add `avatarPath: true` at the top-level user select, and include it in the mapped result. Find the `.map()` call that builds `StudentListRow` and add:

```ts
avatarPath: u.avatarPath,
```

- [ ] **Step 3: Update all three pages that render StudentsList to compute avatarUrl**

Three pages render `StudentsList`:
- `src/app/super/students/page.tsx`
- `src/app/admin/students/page.tsx`
- `src/app/mentor/students/page.tsx`

In each file, add the storage import and map rows after fetching:

```ts
import { getStorage } from "@/lib/storage";
```

Then inside the page function, after the `listStudentsForScope` call, add:

```ts
const storage = getStorage();
const rowsWithAvatars = await Promise.all(
  rows.map(async (r) => ({
    ...r,
    avatarUrl: r.avatarPath ? await storage.url(r.avatarPath) : null,
  })),
);
```

Pass `rowsWithAvatars` to `<StudentsList rows={rowsWithAvatars} ...>` in all three pages.

- [ ] **Step 4: Update StudentListRow to include optional avatarUrl**

In `src/lib/students-query.ts`, add `avatarUrl?: string | null` to `StudentListRow`:

```ts
export interface StudentListRow {
  id: number;
  name: string | null;
  email: string;
  university: string | null;
  year: string | null;
  photoPath: string | null;
  avatarPath: string | null;
  avatarUrl?: string | null;
  activeSeasonTitle: string | null;
  groupName: string | null;
}
```

- [ ] **Step 5: Wire AvatarImage in StudentsList**

In `src/components/students/students-list.tsx`, import `AvatarImage` and use it:

```ts
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
```

Update the avatar cell in the `columns` definition (the `"name"` column cell):

```tsx
<Avatar className="size-8">
  {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt={row.name ?? row.email} />}
  <AvatarFallback>{initialsFor(row.name, row.email)}</AvatarFallback>
</Avatar>
```

- [ ] **Step 6: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: no errors, all pages compile cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/lib/students-query.ts src/components/students/students-list.tsx src/app/super/students/page.tsx
git commit -m "feat(avatar): display student avatars in roster"
```
