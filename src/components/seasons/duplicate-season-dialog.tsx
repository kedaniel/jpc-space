"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addYears } from "date-fns";
import { z } from "zod";

import { slugifySeasonCode, isValidSeasonCode } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { duplicateSeasonAction } from "@/lib/season-actions";

const schema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    code: z.string().min(2).refine(isValidSeasonCode, {
      message: "Lowercase letters, numbers, and dashes only.",
    }),
    startDate: z.date({ message: "Start date required." }),
    endDate: z.date({ message: "End date required." }),
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End must be on or after start.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

interface DuplicateSeasonDialogProps {
  seasonId: number;
  program: string;
  year: number;
  startDate: Date;
  endDate: Date;
}

export function DuplicateSeasonDialog({
  seasonId,
  program,
  year,
  startDate,
  endDate,
}: DuplicateSeasonDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const nextYear = year + 1;
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: nextYear,
      code: slugifySeasonCode(`${program} ${nextYear}`),
      startDate: addYears(startDate, 1),
      endDate: addYears(endDate, 1),
    },
  });

  const watchedYear = useWatch({ control, name: "year" });
  const [codeTouched, setCodeTouched] = React.useState(false);

  React.useEffect(() => {
    if (codeTouched || !watchedYear) return;
    setValue("code", slugifySeasonCode(`${program} ${watchedYear}`), { shouldValidate: false });
  }, [program, watchedYear, codeTouched, setValue]);

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await duplicateSeasonAction(seasonId, {
        year: values.year,
        code: values.code,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        return;
      }
      setOpen(false);
      router.push(`/super/seasons/${result.code}`);
      router.refresh();
    });
  });

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button variant="outline" size="sm">
            <Copy />
            Duplicate
          </Button>
        }
      />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Duplicate {program} {year}</ModalTitle>
          <ModalDescription>
            Copies groups, sessions, and assignments with dates shifted to match. Students
            are not copied — the new season starts as an empty batch.
          </ModalDescription>
        </ModalHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Year" required error={errors.year?.message}>
              <Input type="number" {...register("year", { valueAsNumber: true })} />
            </FormField>
            <FormField
              label="Code"
              required
              description="URL slug — auto-filled from year."
              error={errors.code?.message}
            >
              <Input
                {...register("code", { onChange: () => setCodeTouched(true) })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Start date" required error={errors.startDate?.message}>
              <Controller
                control={control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <DatePicker
                    value={field.value ?? null}
                    onChange={field.onChange}
                    ariaInvalid={Boolean(fieldState.error)}
                  />
                )}
              />
            </FormField>
            <FormField label="End date" required error={errors.endDate?.message}>
              <Controller
                control={control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <DatePicker
                    value={field.value ?? null}
                    onChange={field.onChange}
                    ariaInvalid={Boolean(fieldState.error)}
                  />
                )}
              />
            </FormField>
          </div>
          {submitError ? (
            <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
              {submitError}
            </p>
          ) : null}
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Duplicating…" : "Duplicate season"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
