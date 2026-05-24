"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteVisibility } from "@/generated/prisma/enums";
import { createNoteAction } from "@/lib/note-actions";

export interface NoteFormProps {
  studentUserId: number;
  defaultVisibility?: NoteVisibility;
  allowFollowUpFlag?: boolean;
}

export function NoteForm({
  studentUserId,
  defaultVisibility = NoteVisibility.LEADERS,
  allowFollowUpFlag = true,
}: NoteFormProps) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [visibility, setVisibility] = React.useState<NoteVisibility>(defaultVisibility);
  const [followUp, setFollowUp] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim() === "" || body === "<p></p>") {
      setError("Note can't be empty.");
      return;
    }
    startTransition(async () => {
      const result = await createNoteAction(studentUserId, {
        body,
        visibility,
        followUpFlagged: followUp,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setFollowUp(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormField label="Note">
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Reflections, prayer requests, follow-up items…"
        />
      </FormField>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <FormField
          label="Visible to"
          description="Who can read this note (in addition to you and admins)."
        >
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as NoteVisibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NoteVisibility.LEADERS}>Leaders</SelectItem>
              <SelectItem value={NoteVisibility.MENTORS}>Mentors</SelectItem>
              <SelectItem value={NoteVisibility.ADMINS}>Admins only</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {allowFollowUpFlag && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={followUp}
              onChange={(e) => setFollowUp(e.target.checked)}
              className="size-4"
            />
            <Flag className="size-4 text-warning-600" />
            Flag for admin follow-up
          </label>
        )}
      </div>
      {error && (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">{error}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
