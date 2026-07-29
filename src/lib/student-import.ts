import { z } from "zod";

import { db } from "@/lib/db";
import { UserRole, EnrollmentStatus } from "@/generated/prisma/enums";
import { cellText, loadFirstWorksheet } from "@/lib/spreadsheet";

export class ImportParseError extends Error {}

export type ImportRowStatus = "new" | "exists" | "duplicate" | "invalid";

export interface ImportProfileFields {
  phone?: string;
  university?: string;
  year?: string;
  dateOfBirth?: string;
  spiritualBackground?: string;
  gifts?: string;
  notes?: string;
}

type ProfileFieldKey = keyof ImportProfileFields;

// Recognized optional column headers (lower-cased) → StudentProfile field.
const PROFILE_ALIASES: Record<string, ProfileFieldKey> = {
  phone: "phone",
  mobile: "phone",
  "mobile no": "phone",
  "mobile no.": "phone",
  "mobile number": "phone",
  "phone number": "phone",
  university: "university",
  college: "university",
  year: "year",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  birthdate: "dateOfBirth",
  "birth date": "dateOfBirth",
  "spiritual background": "spiritualBackground",
  gifts: "gifts",
  "spiritual gifts": "gifts",
  notes: "notes",
};

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  phone: "Mobile No",
  university: "University",
  year: "Year",
  dateOfBirth: "Date of birth",
  spiritualBackground: "Spiritual background",
  gifts: "Gifts",
  notes: "Notes",
};

export interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  email: string;
  status: ImportRowStatus;
  message?: string;
  profile: ImportProfileFields;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  detectedColumns: string[];
  counts: { new: number; exists: number; duplicate: number; invalid: number; total: number };
}

const emailSchema = z.string().trim().email();

const profileSchema = z
  .object({
    phone: z.string().trim().max(50).optional(),
    university: z.string().trim().max(200).optional(),
    year: z.string().trim().max(50).optional(),
    dateOfBirth: z.string().trim().max(40).optional(),
    spiritualBackground: z.string().trim().max(2000).optional(),
    gifts: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .optional();

const rowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  profile: profileSchema,
});

export async function buildImportPreview(buffer: Buffer, filename: string): Promise<ImportPreview> {
  const sheet = await loadFirstWorksheet(buffer, filename);
  if (!sheet) throw new ImportParseError("Could not read any sheet from that file.");

  let nameCol = -1;
  let emailCol = -1;
  const profileCols: { col: number; field: ProfileFieldKey }[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    const key = cellText(cell.value).trim().toLowerCase();
    if (key === "name") nameCol = col;
    else if (key === "email" || key === "e-mail") emailCol = col;
    else {
      const field = PROFILE_ALIASES[key];
      if (field && !profileCols.some((p) => p.field === field)) profileCols.push({ col, field });
    }
  });
  if (nameCol === -1 || emailCol === -1) {
    throw new ImportParseError('The file needs a header row with "name" and "email" columns.');
  }

  const detectedColumns = ["Name", "Email", ...profileCols.map((p) => FIELD_LABELS[p.field])];

  const rows: ImportPreviewRow[] = [];
  const seen = new Set<string>();
  const candidates = new Set<string>();

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = cellText(row.getCell(nameCol).value).trim();
    const email = cellText(row.getCell(emailCol).value).trim();

    const profile: ImportProfileFields = {};
    for (const { col, field } of profileCols) {
      const val = cellText(row.getCell(col).value).trim();
      if (val) profile[field] = val;
    }

    const hasProfileData = Object.keys(profile).length > 0;
    if (!name && !email && !hasProfileData) continue; // blank row

    if (name.length < 2 || !emailSchema.safeParse(email).success) {
      rows.push({
        rowNumber: r,
        name,
        email,
        status: "invalid",
        message: name.length < 2 ? "Name is missing or too short." : "Email is not valid.",
        profile,
      });
      continue;
    }
    if (seen.has(email)) {
      rows.push({
        rowNumber: r,
        name,
        email,
        status: "duplicate",
        message: "Repeated earlier in this file.",
        profile,
      });
      continue;
    }
    seen.add(email);
    candidates.add(email);
    rows.push({ rowNumber: r, name, email, status: "new", profile });
  }

  if (candidates.size > 0) {
    const existing = await db.user.findMany({
      where: { email: { in: [...candidates] } },
      select: { email: true },
    });
    const existingSet = new Set(existing.map((u) => u.email));
    for (const row of rows) {
      if (row.status === "new" && existingSet.has(row.email)) {
        row.status = "exists";
        row.message = "Already in the system.";
      }
    }
  }

  const counts = { new: 0, exists: 0, duplicate: 0, invalid: 0, total: rows.length };
  for (const row of rows) counts[row.status]++;
  return { rows, detectedColumns, counts };
}

export interface ImportCommitRow {
  name: string;
  email: string;
  profile?: ImportProfileFields;
}

export type CommitOutcome = "created" | "skipped" | "failed";

export interface CommitResultRow {
  name: string;
  email: string;
  outcome: CommitOutcome;
  message?: string;
  userId?: number;
}

export interface ImportCommitResult {
  created: number;
  skipped: number;
  failed: number;
  rows: CommitResultRow[];
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function toStudentProfileData(seasonId: number | null, profile: ImportProfileFields | undefined) {
  const p = profile ?? {};
  const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : undefined;
  const dateOfBirth = dob && !Number.isNaN(dob.getTime()) ? dob : undefined;
  return {
    activeSeasonId: seasonId ?? undefined,
    phone: p.phone || undefined,
    university: p.university || undefined,
    year: p.year || undefined,
    dateOfBirth,
    spiritualBackground: p.spiritualBackground || undefined,
    gifts: p.gifts || undefined,
    notes: p.notes || undefined,
  };
}

/**
 * How to import the whole file: either as active students enrolled in a season,
 * or as alumni graduated in a given JPCS year (no season enrollment).
 */
export type ImportMode =
  | { kind: "season"; seasonId: number }
  | { kind: "alumni"; graduationYear: number };

export async function commitStudentImport(
  input: ImportCommitRow[],
  mode: ImportMode,
): Promise<ImportCommitResult> {
  const rows: CommitResultRow[] = [];
  const isAlumni = mode.kind === "alumni";

  for (const item of input) {
    const parsed = rowSchema.safeParse(item);
    if (!parsed.success) {
      rows.push({ name: item.name, email: item.email, outcome: "failed", message: "Invalid name or email." });
      continue;
    }
    const { name, email, profile } = parsed.data;

    try {
      const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        rows.push({ name, email, outcome: "skipped", message: "Already in the system." });
        continue;
      }

      const created = await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            role: UserRole.STUDENT,
            graduationYear: isAlumni ? mode.graduationYear : null,
            passwordHash: null,
            studentProfile: {
              create: toStudentProfileData(isAlumni ? null : mode.seasonId, profile),
            },
          },
          select: { id: true },
        });
        if (!isAlumni) {
          await tx.seasonEnrollment.create({
            data: { studentUserId: user.id, seasonId: mode.seasonId, status: EnrollmentStatus.ACTIVE },
          });
        }
        return user;
      });

      rows.push({ name, email, outcome: "created", userId: created.id });
    } catch (err) {
      if (isUniqueViolation(err)) {
        rows.push({ name, email, outcome: "skipped", message: "Already in the system." });
      } else {
        console.error(`[student-import] failed for ${email}:`, err);
        rows.push({ name, email, outcome: "failed", message: "Could not create this account." });
      }
    }
  }

  return {
    created: rows.filter((r) => r.outcome === "created").length,
    skipped: rows.filter((r) => r.outcome === "skipped").length,
    failed: rows.filter((r) => r.outcome === "failed").length,
    rows,
  };
}
