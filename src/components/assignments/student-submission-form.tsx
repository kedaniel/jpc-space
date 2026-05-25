"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict, isPast } from "date-fns";
import { File as FileIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextView } from "@/components/ui/rich-text-view";
import {
  saveSubmissionDraftAction,
  submitSubmissionAction,
  uploadSubmissionFileAction,
  removeSubmissionFileAction,
} from "@/lib/submission-actions";

interface AttachedFile {
  id: number;
  originalName: string;
  sizeBytes: number;
}

export interface StudentSubmissionFormProps {
  submissionId: number;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "RETURNED";
  initialText: string;
  initialFiles: AttachedFile[];
  feedback: string | null;
  dueAt: Date | null;
  acceptsFiles: boolean;
  maxFileSizeMb: number | null;
  allowedMimeCategories: string[];
}

function dueBanner(dueAt: Date | null, status: string) {
  if (!dueAt) return null;
  if (status === "REVIEWED") return null;
  const past = isPast(dueAt);
  if (past) {
    return (
      <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
        Past due — submitted work will be marked late.
      </div>
    );
  }
  const ms = dueAt.getTime() - Date.now();
  const urgent = ms < 24 * 60 * 60 * 1000;
  return (
    <div
      className={
        urgent
          ? "rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-800"
          : "rounded-md bg-info-50 px-3 py-2 text-sm text-info-800"
      }
    >
      Due in {formatDistanceToNowStrict(dueAt)}
    </div>
  );
}

function categoryToAccept(categories: string[]): string | undefined {
  if (categories.length === 0) return undefined;
  const map: Record<string, string> = {
    image: "image/*",
    pdf: "application/pdf",
    doc: ".doc,.docx,.odt",
    audio: "audio/*",
    video: "video/*",
    text: "text/*",
  };
  return categories.map((c) => map[c]).filter(Boolean).join(",");
}

export function StudentSubmissionForm({
  submissionId,
  status,
  initialText,
  initialFiles,
  feedback,
  dueAt,
  acceptsFiles,
  maxFileSizeMb,
  allowedMimeCategories,
}: StudentSubmissionFormProps) {
  const router = useRouter();
  const [text, setText] = React.useState(initialText);
  const [files, setFiles] = React.useState<AttachedFile[]>(initialFiles);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const readOnly = status === "REVIEWED" || (status === "SUBMITTED" && dueAt && isPast(dueAt));
  const isSubmitted = status === "SUBMITTED" || status === "REVIEWED" || status === "RETURNED";

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  function saveDraft() {
    clearMessages();
    startTransition(async () => {
      const result = await saveSubmissionDraftAction(submissionId, text);
      if (!result.ok) setError(result.error);
      else setInfo("Draft saved.");
    });
  }

  function submit() {
    clearMessages();
    startTransition(async () => {
      const result = await submitSubmissionAction(submissionId, text);
      if (!result.ok) setError(result.error);
      else {
        setInfo("Submitted!");
        router.refresh();
      }
    });
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    clearMessages();
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await uploadSubmissionFileAction(submissionId, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFiles((prev) => [
        ...prev,
        { id: result.fileId!, originalName: file.name, sizeBytes: file.size },
      ]);
      setInfo("Uploaded.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function removeFile(id: number) {
    clearMessages();
    startTransition(async () => {
      const result = await removeSubmissionFileAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
    });
  }

  const submitDisabled = pending || (text.trim() === "" && files.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {dueBanner(dueAt, status)}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your submission</CardTitle>
          {status !== "DRAFT" && (
            <Badge variant={status === "REVIEWED" ? "success" : "info"}>
              {status === "REVIEWED" ? "Reviewed" : "Submitted"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {readOnly ? (
            <RichTextView
              html={text}
              emptyText="No written response."
            />
          ) : (
            <RichTextEditor
              value={text}
              onChange={setText}
              placeholder="Write your response…"
            />
          )}

          {acceptsFiles && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Files {maxFileSizeMb ? `(max ${maxFileSizeMb} MB each)` : ""}
              </p>
              <ul className="flex flex-col gap-1.5">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.originalName}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {(f.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeFile(f.id)}
                        disabled={pending}
                        aria-label={`Remove ${f.originalName}`}
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={onFileChosen}
                    accept={categoryToAccept(allowedMimeCategories)}
                    className="text-sm"
                    disabled={pending}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-800">
              {info}
            </p>
          )}

          {!readOnly && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={pending}
              >
                {pending ? "Saving…" : isSubmitted ? "Save changes (draft)" : "Save draft"}
              </Button>
              <Button type="button" onClick={submit} disabled={submitDisabled}>
                {pending
                  ? "Submitting…"
                  : isSubmitted
                    ? "Re-submit"
                    : "Submit"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leader feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextView html={feedback} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
