"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { SeasonStatus } from "@/generated/prisma/enums";
import { slugifySeasonCode, isValidSeasonCode } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSeasonAction,
  updateSeasonAction,
  type SeasonInput,
} from "@/lib/season-actions";

const schema = z
  .object({
    code: z.string().min(2).refine(isValidSeasonCode, {
      message: "Lowercase letters, numbers, and dashes only.",
    }),
    title: z.string().min(2, "Title is required."),
    description: z.string().max(2000).optional(),
    startDate: z.date({ message: "Start date required." }),
    endDate: z.date({ message: "End date required." }),
    status: z.enum([
      SeasonStatus.DRAFT,
      SeasonStatus.ACTIVE,
      SeasonStatus.COMPLETED,
      SeasonStatus.ARCHIVED,
    ]),
    lateThresholdMinutes: z.number().int().min(1).max(120),
    absenceBudgetMinutes: z.number().int().min(1),
    absenceWeightMinutes: z.number().int().min(1),
    lateWeightMinutes: z.number().int().min(1),
  })
  .refine((v) => v.endDate.getTime() >= v.startDate.getTime(), {
    message: "End must be on or after start.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

export interface SeasonFormProps {
  mode: "create" | "edit";
  seasonId?: number;
  defaultValues?: Partial<FormValues>;
}

const statusOptions: { value: SeasonStatus; label: string }[] = [
  { value: SeasonStatus.DRAFT, label: "Draft" },
  { value: SeasonStatus.ACTIVE, label: "Active" },
  { value: SeasonStatus.COMPLETED, label: "Completed" },
  { value: SeasonStatus.ARCHIVED, label: "Archived" },
];

export function SeasonForm({ mode, seasonId, defaultValues }: SeasonFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

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
      code: defaultValues?.code ?? "",
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      startDate: defaultValues?.startDate,
      endDate: defaultValues?.endDate,
      status: defaultValues?.status ?? SeasonStatus.DRAFT,
      lateThresholdMinutes: defaultValues?.lateThresholdMinutes ?? 15,
      absenceBudgetMinutes: defaultValues?.absenceBudgetMinutes ?? 180,
      absenceWeightMinutes: defaultValues?.absenceWeightMinutes ?? 90,
      lateWeightMinutes: defaultValues?.lateWeightMinutes ?? 30,
    },
  });

  const title = useWatch({ control, name: "title" });
  const [codeTouched, setCodeTouched] = React.useState(
    mode === "edit" || Boolean(defaultValues?.code),
  );

  React.useEffect(() => {
    if (codeTouched) return;
    if (!title) return;
    setValue("code", slugifySeasonCode(title), { shouldValidate: false });
  }, [title, codeTouched, setValue]);

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const payload: SeasonInput = {
        code: values.code,
        title: values.title,
        description: values.description ?? null,
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status,
        lateThresholdMinutes: values.lateThresholdMinutes,
        absenceBudgetMinutes: values.absenceBudgetMinutes,
        absenceWeightMinutes: values.absenceWeightMinutes,
        lateWeightMinutes: values.lateWeightMinutes,
      };
      const result =
        mode === "create"
          ? await createSeasonAction(payload)
          : await updateSeasonAction(seasonId!, payload);

      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        return;
      }
      router.push(`/super/seasons/${result.code ?? values.code}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Title" required error={errors.title?.message}>
          <Input {...register("title")} placeholder="e.g. Summer 2026" />
        </FormField>
        <FormField
          label="Code"
          required
          description="URL slug — auto-filled from title."
          error={errors.code?.message}
        >
          <Input
            {...register("code", {
              onChange: () => setCodeTouched(true),
            })}
            placeholder="summer-2026"
          />
        </FormField>
      </div>

      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          rows={3}
          placeholder="Optional summary shown on the season overview."
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <FormField label="Status" required error={errors.status?.message}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">Attendance rules</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Late threshold (minutes)"
            description="Minutes after session start before a student is marked LATE."
            error={errors.lateThresholdMinutes?.message}
          >
            <Input
              type="number"
              min={1}
              max={120}
              {...register("lateThresholdMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Absence budget (minutes)"
            description="Total minutes a student may miss before being flagged."
            error={errors.absenceBudgetMinutes?.message}
          >
            <Input
              type="number"
              min={1}
              {...register("absenceBudgetMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Absence weight (minutes)"
            description="How many budget minutes one ABSENT consumes."
            error={errors.absenceWeightMinutes?.message}
          >
            <Input
              type="number"
              min={1}
              {...register("absenceWeightMinutes", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Late weight (minutes)"
            description="How many budget minutes one LATE arrival consumes."
            error={errors.lateWeightMinutes?.message}
          >
            <Input
              type="number"
              min={1}
              {...register("lateWeightMinutes", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </div>

      {submitError ? (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create season" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
