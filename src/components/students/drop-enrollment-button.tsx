"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { dropEnrollmentAction } from "@/lib/enrollment-actions";

interface DropEnrollmentButtonProps {
  enrollmentId: number;
  seasonTitle: string;
}

export function DropEnrollmentButton({ enrollmentId, seasonTitle }: DropEnrollmentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button variant="outline" size="sm">
            <UserMinus />
            Drop
          </Button>
        }
      />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Drop from {seasonTitle}?</ModalTitle>
          <ModalDescription>
            Marks this enrollment as withdrawn and adds the student to the dropped-students
            pool. This does not affect other seasons they&apos;re enrolled in.
          </ModalDescription>
        </ModalHeader>
        <FormField label="Reason" description="Optional — visible in the dropped-students list.">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Moved cities, stopped attending, personal reasons…"
          />
        </FormField>
        {error ? (
          <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">{error}</p>
        ) : null}
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await dropEnrollmentAction(enrollmentId, { reason });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {pending ? "Dropping…" : "Drop student"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
