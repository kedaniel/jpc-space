"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteJpcEventAction } from "@/lib/jpc-event-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { JpcEventRow } from "@/lib/jpc-events-query";
import { JpcEventForm } from "./jpc-event-form";

interface JpcEventManagerClientProps {
  events: JpcEventRow[];
}

export function JpcEventManagerClient({ events: initialEvents }: JpcEventManagerClientProps) {
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    await deleteJpcEventAction(id);
  }

  if (creating) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">New JPC event</h2>
        <JpcEventForm onDone={() => setCreating(false)} />
      </div>
    );
  }

  if (editingId !== null) {
    const event = initialEvents.find((e) => e.id === editingId);
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">Edit event</h2>
        <JpcEventForm event={event} onDone={() => setEditingId(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4 mr-1.5" />
          New event
        </Button>
      </div>

      {initialEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No JPC events yet"
          description="Create an event to share with all members or alumni."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {initialEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{e.title}</span>
                  <Badge variant={e.visibility === "ALUMNI_ONLY" ? "warning" : "outline"}>
                    {e.visibility === "ALUMNI_ONLY" ? "Alumni only" : "Everyone"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(e.date, "EEE, MMM d, yyyy")}
                </p>
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-teal-500 hover:underline truncate"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    {e.url}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(e.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="size-3.5 text-error-500" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
