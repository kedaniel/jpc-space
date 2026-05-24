"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { NoteVisibility } from "@/generated/prisma/enums";
import { createNoteAction } from "@/lib/note-actions";

interface MentorNoteComposerProps {
  students: { id: number; name: string | null; email: string }[];
}

export function MentorNoteComposer({ students }: MentorNoteComposerProps) {
  const router = useRouter();
  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [body, setBody] = React.useState("");
  const [followUp, setFollowUp] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const options: ComboboxOption[] = students.map((s) => ({
    value: String(s.id),
    label: s.name ?? s.email,
    description: s.email,
  }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) {
      setError("Pick a student.");
      return;
    }
    if (body.trim() === "" || body === "<p></p>") {
      setError("Note can't be empty.");
      return;
    }
    startTransition(async () => {
      const result = await createNoteAction(Number(studentId), {
        body,
        visibility: NoteVisibility.MENTORS,
        followUpFlagged: followUp,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setFollowUp(false);
      setStudentId(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <FormField label="Student" required>
            <Combobox
              options={options}
              value={studentId}
              onChange={setStudentId}
              placeholder="Search students…"
              emptyMessage="No students."
            />
          </FormField>
          <FormField label="Note">
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Reflections, prayer requests, follow-up items…"
            />
          </FormField>
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
          {error && (
            <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
