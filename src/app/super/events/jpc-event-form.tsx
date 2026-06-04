"use client";

import * as React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createJpcEventAction, updateJpcEventAction } from "@/lib/jpc-event-actions";
import type { JpcEventRow } from "@/lib/jpc-events-query";

interface JpcEventFormProps {
  event?: JpcEventRow;
  onDone: () => void;
}

export function JpcEventForm({ event, onDone }: JpcEventFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = event
      ? await updateJpcEventAction(event.id, fd)
      : await createJpcEventAction(fd);
    setPending(false);
    if (result && "error" in result) {
      setError(result.error ?? "Unknown error");
    } else {
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="title">Title</label>
        <Input
          id="title"
          name="title"
          defaultValue={event?.title}
          placeholder="Spring Retreat"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="date">Date</label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={event ? format(event.date, "yyyy-MM-dd") : ""}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="url">Link (optional)</label>
        <Input
          id="url"
          name="url"
          type="url"
          defaultValue={event?.url ?? ""}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="visibility">Visibility</label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={event?.visibility ?? "ALL"}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">Everyone</option>
          <option value="ALUMNI_ONLY">Alumni only (leaders, admins)</option>
        </select>
      </div>

      {error && <p className="text-sm text-error-500">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
