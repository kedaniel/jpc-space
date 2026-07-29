"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isSuper } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/errors";
import {
  buildImportPreview,
  commitStudentImport,
  ImportParseError,
  type ImportPreview,
  type ImportCommitResult,
} from "@/lib/student-import";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT = [".csv", ".xlsx"];

export type PreviewActionResult =
  | { ok: true; preview: ImportPreview }
  | { ok: false; error: string };

export async function previewStudentImportAction(formData: FormData): Promise<PreviewActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return { ok: false, error: "File must be a .csv or .xlsx." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "File must be under 5 MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const preview = await buildImportPreview(buffer, file.name);
    return { ok: true, preview };
  } catch (err) {
    if (err instanceof ImportParseError) return { ok: false, error: err.message };
    console.error("[student-import] preview failed:", err);
    return { ok: false, error: "Could not read that file. Make sure it is a valid CSV or Excel sheet." };
  }
}

const CURRENT_YEAR = new Date().getFullYear();

const rowsSchema = z
  .array(
    z.object({
      name: z.string(),
      email: z.string(),
      profile: z
        .object({
          phone: z.string().optional(),
          university: z.string().optional(),
          year: z.string().optional(),
          dateOfBirth: z.string().optional(),
          spiritualBackground: z.string().optional(),
          gifts: z.string().optional(),
          notes: z.string().optional(),
        })
        .optional(),
    }),
  )
  .min(1)
  .max(2000);

const commitSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("season"), seasonId: z.number().int().positive(), rows: rowsSchema }),
  z.object({
    mode: z.literal("alumni"),
    graduationYear: z.number().int().min(1990).max(CURRENT_YEAR),
    rows: rowsSchema,
  }),
]);

export type CommitActionResult =
  | { ok: true; result: ImportCommitResult }
  | { ok: false; error: string };

export async function commitStudentImportAction(
  input: z.infer<typeof commitSchema>,
): Promise<CommitActionResult> {
  const user = await getCurrentUserOrRedirect();
  if (!isSuper(user)) throw new ForbiddenError();

  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid import request." };

  if (parsed.data.mode === "season") {
    const season = await db.season.findFirst({
      where: { id: parsed.data.seasonId, deletedAt: null },
      select: { id: true },
    });
    if (!season) return { ok: false, error: "The selected season no longer exists." };

    const result = await commitStudentImport(parsed.data.rows, {
      kind: "season",
      seasonId: season.id,
    });
    revalidatePath("/super/users");
    return { ok: true, result };
  }

  const result = await commitStudentImport(parsed.data.rows, {
    kind: "alumni",
    graduationYear: parsed.data.graduationYear,
  });
  revalidatePath("/super/users");
  return { ok: true, result };
}
