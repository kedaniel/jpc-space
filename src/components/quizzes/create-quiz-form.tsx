"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuizAction } from "@/lib/quiz-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  sessionId: number;
  seasonId: number;
  onCreated?: () => void;
}

export function CreateQuizForm({ sessionId, seasonId, onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const score = parseInt(maxScore, 10);
    if (!title.trim() || isNaN(score) || score < 1) {
      setError("Title and a valid max score are required.");
      return;
    }
    startTransition(async () => {
      const result = await createQuizAction(sessionId, seasonId, title.trim(), score);
      if (result.error) {
        setError(result.error);
      } else {
        setTitle("");
        setMaxScore("100");
        setOpen(false);
        onCreated?.();
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add quiz
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-neutral-500">Title</label>
        <Input
          type="text"
          size="sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week 3 Quiz"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-neutral-500">Max score</label>
        <Input
          type="number"
          size="sm"
          min={1}
          max={1000}
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          className="w-24"
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => { setOpen(false); setError(null); }}
      >
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-error-600">{error}</p>}
    </form>
  );
}
