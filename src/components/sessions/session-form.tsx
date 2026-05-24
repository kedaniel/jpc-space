"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSessionAction,
  updateSessionAction,
  type CreateSessionInput,
  type UpdateSessionInput,
} from "@/lib/session-actions";
import type { RecurrenceScope } from "@/lib/recurrence";

const schema = z.object({
  title: z.string().min(2, "Title is required."),
  date: z.date({ message: "Date required." }),
  time: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  durationMinutes: z.number().int().min(15).max(600),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  repeatWeeks: z.number().int().min(1).max(26),
  scope: z.enum(["one", "future", "all"]),
});

type FormValues = z.infer<typeof schema>;

function combineDateTime(date: Date, time: { hour: number; minute: number }): Date {
  const d = new Date(date);
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

export interface SessionFormProps {
  mode: "create" | "edit";
  seasonId: number;
  seasonCode: string;
  sessionId?: number;
  hasRecurrence?: boolean;
  defaultValues?: {
    title: string;
    startsAt: Date;
    durationMinutes: number;
    location: string | null;
    description: string | null;
  };
}

export function SessionForm({
  mode,
  seasonId,
  seasonCode,
  sessionId,
  hasRecurrence,
  defaultValues,
}: SessionFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      date: defaultValues?.startsAt,
      time: defaultValues
        ? { hour: defaultValues.startsAt.getHours(), minute: defaultValues.startsAt.getMinutes() }
        : { hour: 18, minute: 0 },
      durationMinutes: defaultValues?.durationMinutes ?? 90,
      location: defaultValues?.location ?? "",
      description: defaultValues?.description ?? "",
      repeatWeeks: 1,
      scope: "one",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const startsAt = combineDateTime(values.date, values.time);
      if (mode === "create") {
        const payload: CreateSessionInput = {
          title: values.title,
          startsAt,
          durationMinutes: values.durationMinutes,
          location: values.location || null,
          description: values.description || null,
          repeatWeeks: values.repeatWeeks,
        };
        const result = await createSessionAction(seasonId, payload);
        if (!result.ok) return handleErr(result.error, result.fieldErrors);
        router.push(`/admin/season/${seasonCode}/calendar`);
      } else {
        const payload: UpdateSessionInput = {
          title: values.title,
          startsAt,
          durationMinutes: values.durationMinutes,
          location: values.location || null,
          description: values.description || null,
          scope: values.scope as RecurrenceScope,
        };
        const result = await updateSessionAction(sessionId!, payload);
        if (!result.ok) return handleErr(result.error, result.fieldErrors);
        router.push(`/admin/season/${seasonCode}/sessions/${sessionId}`);
      }
      router.refresh();
    });
  });

  function handleErr(error: string, fieldErrors?: Record<string, string>) {
    setSubmitError(error);
    if (fieldErrors) {
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof FormValues, { message });
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <FormField label="Title" required error={errors.title?.message}>
        <Input {...register("title")} placeholder="e.g. Week 4 — Topic" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField label="Date" required error={errors.date?.message}>
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaInvalid={Boolean(fieldState.error)}
              />
            )}
          />
        </FormField>
        <FormField label="Start time" required error={errors.time?.message}>
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <TimePicker
                value={field.value}
                onChange={field.onChange}
                minuteStep={15}
              />
            )}
          />
        </FormField>
        <FormField label="Duration (min)" required error={errors.durationMinutes?.message}>
          <Input
            type="number"
            min={15}
            max={600}
            {...register("durationMinutes", { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField label="Location" error={errors.location?.message}>
        <Input {...register("location")} placeholder="Room, link, or address" />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          rows={3}
          placeholder="Optional notes shown to leaders and students."
        />
      </FormField>

      {mode === "create" && (
        <FormField
          label="Repeat weekly for…"
          description="Creates one occurrence per week, sharing a recurrence group."
          error={errors.repeatWeeks?.message}
        >
          <Input
            type="number"
            min={1}
            max={26}
            {...register("repeatWeeks", { valueAsNumber: true })}
          />
        </FormField>
      )}

      {mode === "edit" && hasRecurrence && (
        <FormField label="Apply to" error={errors.scope?.message}>
          <Controller
            control={control}
            name="scope"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">This session only</SelectItem>
                  <SelectItem value="future">This and future sessions</SelectItem>
                  <SelectItem value="all">All sessions in the series</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      )}

      {submitError && (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
          {submitError}
        </p>
      )}

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
          {pending ? "Saving…" : mode === "create" ? "Create session" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
