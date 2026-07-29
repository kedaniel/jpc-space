"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { graduateStudentAction } from "@/lib/enrollment-actions";

interface GraduateStudentButtonProps {
  studentUserId: number;
  studentName: string;
}

export function GraduateStudentButton({ studentUserId, studentName }: GraduateStudentButtonProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(String(currentYear));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button variant="outline" size="sm">
            <GraduationCap />
            Graduate
          </Button>
        }
      />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Graduate {studentName}?</ModalTitle>
          <ModalDescription>
            Marks {studentName} as a JPCS alumnus, closes out their current season as completed,
            and removes them from the active roster. They become eligible to be promoted to a
            leader, season admin, or mentor.
          </ModalDescription>
        </ModalHeader>
        <FormField label="JPCS graduation year" required error={error ?? undefined}>
          <Input
            type="number"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </FormField>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              const parsed = Number(year);
              if (!Number.isInteger(parsed) || parsed < 1990 || parsed > currentYear) {
                setError(`Enter a year between 1990 and ${currentYear}.`);
                return;
              }
              startTransition(async () => {
                const result = await graduateStudentAction(studentUserId, { graduationYear: parsed });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {pending ? "Graduating…" : "Graduate student"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
