"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createJpcEventAction, updateJpcEventAction } from "@/lib/jpc-event-actions";
import type { JpcEventRow } from "@/lib/jpc-events-query";

interface JpcEventFormProps {
  event?: JpcEventRow;
  seasons: { id: number; title: string }[];
  onDone: () => void;
}

type Visibility = "ALL" | "ALUMNI_ONLY" | "SEASON";

// Must match MAX_IMAGE_BYTES in src/lib/jpc-event-actions.ts — checked here too so an
// oversized file fails immediately instead of stalling on the upload round-trip.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function JpcEventForm({ event, seasons, onDone }: JpcEventFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [visibility, setVisibility] = React.useState<Visibility>(event?.visibility ?? "ALL");
  const [seasonId, setSeasonId] = React.useState<string>(
    event?.seasonId ? String(event.seasonId) : "",
  );

  const visibilityItems: Record<string, string> = {
    ALL: "Everyone",
    ALUMNI_ONLY: "Alumni only",
    SEASON: "Season only",
  };
  const seasonItems: Record<string, string> = Object.fromEntries(
    seasons.map((s) => [String(s.id), s.title]),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const photo = fd.get("photo");
    if (photo instanceof File && photo.size > MAX_PHOTO_BYTES) {
      setPending(false);
      setError("Photo must be under 5 MB.");
      return;
    }
    const result = event
      ? await updateJpcEventAction(event.id, fd)
      : await createJpcEventAction(fd);
    setPending(false);
    if (result && "error" in result) {
      setError(result.error ?? "Unknown error");
    } else {
      router.refresh();
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
        <label className="text-sm font-medium" htmlFor="description">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={event?.description ?? ""}
          rows={3}
          placeholder="What's this event about?"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label className="text-sm font-medium" htmlFor="time">
            Time <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="time"
            name="time"
            type="time"
            defaultValue={
              event && (event.date.getHours() !== 0 || event.date.getMinutes() !== 0)
                ? format(event.date, "HH:mm")
                : ""
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="endDate">
            End date <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={event?.endDate ? format(event.endDate, "yyyy-MM-dd") : ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="endTime">
            End time <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={
              event?.endDate && (event.endDate.getHours() !== 0 || event.endDate.getMinutes() !== 0)
                ? format(event.endDate, "HH:mm")
                : ""
            }
          />
        </div>
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
        <label className="text-sm font-medium" htmlFor="photo">
          Photo <span className="text-muted-foreground">(optional)</span>
        </label>
        {event?.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            width={480}
            height={192}
            unoptimized
            className="h-40 w-full rounded-lg object-cover"
          />
        )}
        <Input id="photo" name="photo" type="file" accept="image/*" />
        {event?.imageUrl && (
          <p className="text-xs text-muted-foreground">Upload a new photo to replace the current one.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="visibility">Visibility</label>
        <Select items={visibilityItems} value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
          <SelectTrigger id="visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Everyone</SelectItem>
            <SelectItem value="ALUMNI_ONLY">Alumni only (leaders, admins)</SelectItem>
            <SelectItem value="SEASON">Season only</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="visibility" value={visibility} />
      </div>

      {visibility === "SEASON" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="seasonId">Season</label>
          <Select items={seasonItems} value={seasonId} onValueChange={(v) => setSeasonId(v as string)}>
            <SelectTrigger id="seasonId">
              <SelectValue placeholder="Choose a season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="seasonId" value={seasonId} />
        </div>
      )}

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
