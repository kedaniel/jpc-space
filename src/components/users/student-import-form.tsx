"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  previewStudentImportAction,
  commitStudentImportAction,
} from "@/lib/student-import-actions";
import { sendInvitesAction } from "@/lib/invite-actions";
import { toast } from "sonner";
import type {
  ImportPreview,
  ImportPreviewRow,
  ImportRowStatus,
  ImportCommitResult,
} from "@/lib/student-import";

interface SeasonOption {
  id: number;
  title: string;
  code: string;
}

interface StudentImportFormProps {
  seasons: SeasonOption[];
}

const STATUS_BADGE: Record<
  ImportRowStatus,
  { variant: "success" | "warning" | "error"; label: string }
> = {
  new: { variant: "success", label: "New" },
  exists: { variant: "warning", label: "Skip · exists" },
  duplicate: { variant: "warning", label: "Skip · duplicate" },
  invalid: { variant: "error", label: "Invalid" },
};

type ImportMode = "season" | "alumni";
const CURRENT_YEAR = new Date().getFullYear();

export function StudentImportForm({ seasons }: StudentImportFormProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<ImportMode>("season");
  const [file, setFile] = React.useState<File | null>(null);
  const [seasonId, setSeasonId] = React.useState<string>("");
  const [gradYear, setGradYear] = React.useState<string>(String(CURRENT_YEAR));
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [result, setResult] = React.useState<ImportCommitResult | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [invited, setInvited] = React.useState(false);

  const gradYearNum = Number(gradYear);
  const gradYearValid =
    /^\d{4}$/.test(gradYear) && gradYearNum >= 1990 && gradYearNum <= CURRENT_YEAR;
  const targetChosen = mode === "season" ? Boolean(seasonId) : gradYearValid;

  function onFilesChange(files: File[]) {
    setFile(files[0] ?? null);
    setPreview(null);
    setResult(null);
    setInvited(false);
    setError(null);
  }

  async function runPreview() {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await previewStudentImportAction(formData);
    setPreviewing(false);
    if (!res.ok) {
      setPreview(null);
      setError(res.error);
      return;
    }
    setPreview(res.preview);
  }

  async function runImport() {
    if (!preview || !targetChosen) return;
    const rows = preview.rows
      .filter((r) => r.status === "new")
      .map((r) => ({ name: r.name, email: r.email, profile: r.profile }));
    if (rows.length === 0) return;

    setCommitting(true);
    setError(null);
    const res = await commitStudentImportAction(
      mode === "season"
        ? { mode: "season", seasonId: Number(seasonId), rows }
        : { mode: "alumni", graduationYear: gradYearNum, rows },
    );
    setCommitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.result);
    setInvited(false);
    setPreview(null);
    setFile(null);
    router.refresh();
  }

  async function sendInvitesForBatch() {
    if (!result) return;
    const ids = result.rows
      .filter((r) => r.outcome === "created" && typeof r.userId === "number")
      .map((r) => r.userId as number);
    if (ids.length === 0) return;
    setInviting(true);
    const res = await sendInvitesAction(ids);
    setInviting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setInvited(true);
    toast.success(`Invites sent: ${res.sent}${res.failed ? ` · ${res.failed} failed` : ""}`);
    router.refresh();
  }

  const seasonItems: Record<string, string> = Object.fromEntries(
    seasons.map((s) => [String(s.id), s.title]),
  );

  const columns: DataTableColumn<ImportPreviewRow>[] = [
    { key: "row", header: "Row", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.rowNumber}</span> },
    { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name || "—"}</span> },
    { key: "email", header: "Email", cell: (r) => <span className="text-muted-foreground">{r.email || "—"}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span className="flex flex-col gap-0.5">
          <Badge variant={STATUS_BADGE[r.status].variant} className="w-fit">
            {STATUS_BADGE[r.status].label}
          </Badge>
          {r.message ? <span className="text-xs text-muted-foreground">{r.message}</span> : null}
        </span>
      ),
    },
  ];

  const newCount = preview?.counts.new ?? 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {result ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-success-50 px-4 py-3 dark:bg-success-950/40">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-600" />
            <div className="text-sm">
              <p className="font-semibold text-success-800 dark:text-success-200">Import complete</p>
              <p className="text-success-700 dark:text-success-300">
                {result.created} created · {result.skipped} skipped · {result.failed} failed
              </p>
              {result.created > 0 && !invited ? (
                <p className="mt-1 text-success-700 dark:text-success-300">
                  Invites haven&rsquo;t been sent yet — send them below when you&rsquo;re ready.
                </p>
              ) : null}
            </div>
          </div>
          {result.rows.some((r) => r.outcome !== "created") ? (
            <ul className="flex flex-col gap-1 text-sm">
              {result.rows
                .filter((r) => r.outcome !== "created")
                .map((r) => (
                  <li key={r.email} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{r.email}</span> — {r.message}
                  </li>
                ))}
            </ul>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setInvited(false);
              }}
            >
              Import another file
            </Button>
            {result.created > 0 ? (
              <Button variant="outline" onClick={sendInvitesForBatch} disabled={inviting || invited}>
                {inviting
                  ? "Sending…"
                  : invited
                    ? "Invites sent"
                    : `Send ${result.created} invite${result.created === 1 ? "" : "s"}`}
              </Button>
            ) : null}
            <Button onClick={() => router.push("/super/users")}>View users</Button>
          </div>
        </div>
      ) : (
        <>
          <FormField label="Import as" required>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setMode("season")}
                aria-pressed={mode === "season"}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  mode === "season"
                    ? "border-brand-teal-500 bg-brand-teal-50 dark:bg-brand-teal-950"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <span className="font-semibold text-foreground">Active students</span>
                <span className="block text-xs text-muted-foreground">Enroll in a season</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("alumni")}
                aria-pressed={mode === "alumni"}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  mode === "alumni"
                    ? "border-brand-teal-500 bg-brand-teal-50 dark:bg-brand-teal-950"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <span className="font-semibold text-foreground">Alumni</span>
                <span className="block text-xs text-muted-foreground">Graduated, no season</span>
              </button>
            </div>
          </FormField>

          {mode === "season" ? (
            seasons.length === 0 ? (
              <p className="rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:bg-warning-950/40 dark:text-warning-200">
                No seasons yet — create a season first, or import these people as alumni instead.
              </p>
            ) : (
              <FormField label="Season" required>
                <Select
                  items={seasonItems}
                  value={seasonId}
                  onValueChange={(v) => setSeasonId(v as string)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the season to enroll students in" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )
          ) : (
            <FormField
              label="JPCS graduation year"
              required
              error={gradYear && !gradYearValid ? `Enter a year between 1990 and ${CURRENT_YEAR}.` : undefined}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="sm:max-w-48"
              />
            </FormField>
          )}

          <FormField label="Spreadsheet" required>
            <FileUpload accept=".csv,.xlsx" maxSizeMb={5} onFilesChange={onFilesChange} />
            <p className="mt-1 text-xs text-muted-foreground">
              CSV or Excel with a header row. <code>name</code> and <code>email</code> are required.
              Optional columns: Mobile No, University, Year, Date of birth, Spiritual background,
              Gifts, Notes. Everyone in the file is imported {mode === "season" ? "as active students in the chosen season" : "as alumni of the chosen graduation year"}.
            </p>
          </FormField>

          {error ? (
            <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800 dark:bg-error-950/40 dark:text-error-200">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" onClick={runPreview} disabled={!file || previewing}>
              {previewing ? "Reading…" : "Preview"}
            </Button>
          </div>

          {preview ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {preview.counts.total} rows · <span className="font-medium text-success-700 dark:text-success-400">{preview.counts.new} new</span> ·{" "}
                {preview.counts.exists} existing · {preview.counts.duplicate} duplicate · {preview.counts.invalid} invalid
              </p>
              <p className="text-xs text-muted-foreground">
                Columns detected: {preview.detectedColumns.join(", ")}
              </p>
              <DataTable columns={columns} rows={preview.rows} rowKey={(r) => r.rowNumber} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button onClick={runImport} disabled={committing || newCount === 0 || !targetChosen}>
                  {committing
                    ? "Importing…"
                    : newCount === 0
                      ? "Nothing to import"
                      : mode === "alumni"
                        ? `Import ${newCount} alumn${newCount === 1 ? "us" : "i"}`
                        : `Import ${newCount} student${newCount === 1 ? "" : "s"}`}
                </Button>
              </div>
              {newCount > 0 && !targetChosen ? (
                <p className="text-right text-xs text-error-600">
                  {mode === "season" ? "Choose a season above first." : "Enter a valid graduation year above first."}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
