"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { softDeleteSeasonAction } from "@/lib/season-actions";

interface DeleteSeasonButtonProps {
  seasonId: number;
  title: string;
}

export function DeleteSeasonButton({ seasonId, title }: DeleteSeasonButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Delete season
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${title}"?`}
        description="The season will be hidden from lists. Existing groups, sessions, and attendance are preserved."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            await softDeleteSeasonAction(seasonId);
          });
        }}
      />
    </>
  );
}
