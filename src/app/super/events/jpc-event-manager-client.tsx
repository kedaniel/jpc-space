"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarDays, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteJpcEventAction } from "@/lib/jpc-event-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { JpcEventRow } from "@/lib/jpc-events-query";
import { formatJpcEventWhen } from "@/lib/jpc-event-format";
import { JpcEventForm } from "./jpc-event-form";

interface JpcEventManagerClientProps {
  events: JpcEventRow[];
  seasons: { id: number; title: string }[];
}

export function JpcEventManagerClient({ events: initialEvents, seasons }: JpcEventManagerClientProps) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);

  async function handleDelete(id: number) {
    setDeletingId(id);
    await deleteJpcEventAction(id);
    router.refresh();
    setDeletingId(null);
    setConfirmId(null);
  }

  if (creating) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">New JPC event</h2>
        <JpcEventForm seasons={seasons} onDone={() => setCreating(false)} />
      </div>
    );
  }

  if (editingId !== null) {
    const event = initialEvents.find((e) => e.id === editingId);
    return (
      <div className="rounded-lg border border-border bg-card p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-4">Edit event</h2>
        <JpcEventForm event={event} seasons={seasons} onDone={() => setEditingId(null)} />
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
              {e.imageUrl && (
                <Image
                  src={e.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{e.title}</span>
                  <Badge variant={e.visibility === "ALL" ? "outline" : "warning"}>
                    {e.visibility === "ALUMNI_ONLY"
                      ? "Alumni only"
                      : e.visibility === "SEASON"
                        ? `${e.seasonTitle ?? "Season"} only`
                        : "Everyone"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatJpcEventWhen(e.date, e.endDate)}
                </p>
                {e.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                )}
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
                  onClick={() => setConfirmId(e.id)}
                  disabled={deletingId === e.id}
                >
                  <Trash2 className="size-3.5 text-error-500" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(open) => { if (!open) setConfirmId(null); }}
        title="Delete event?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={deletingId !== null}
        onConfirm={() => { if (confirmId !== null) void handleDelete(confirmId); }}
      />
    </div>
  );
}
