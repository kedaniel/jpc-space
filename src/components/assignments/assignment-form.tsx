"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  createAssignmentAction,
  updateAssignmentAction,
  type AssignmentInput,
} from "@/lib/assignment-actions";

const MIME_CATEGORIES: { value: string; label: string }[] = [
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "doc", label: "Documents (Word, ODF)" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "text", label: "Plain text" },
];

const schema = z.object({
  title: z.string().min(2, "Title is required."),
  description: z.string().optional(),
  date: z.date().optional().nullable(),
  time: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  sessionId: z.string().nullable(),
  acceptsFiles: z.boolean(),
  maxFileSizeMb: z.number().int().min(1).max(100).optional(),
  allowedMimeCategories: z.array(z.string()),
  targetMode: z.enum(["all", "groups"]),
  groupIds: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

export interface AssignmentFormProps {
  mode: "create" | "edit";
  seasonId: number;
  seasonCode: string;
  assignmentId?: number;
  sessions: { id: number; title: string; startsAt: Date }[];
  groups: { id: number; name: string }[];
  defaultValues?: {
    title: string;
    description: string | null;
    dueAt: Date | null;
    sessionId: number | null;
    maxFileSizeMb: number | null;
    allowedMimeCategories: string[];
    isAllGroups: boolean;
    groupIds: number[];
  };
}

export function AssignmentForm({
  mode,
  seasonId,
  seasonCode,
  assignmentId,
  sessions,
  groups,
  defaultValues,
}: AssignmentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const sessionOptions: ComboboxOption[] = sessions.map((s) => ({
    value: String(s.id),
    label: s.title,
    description: s.startsAt.toLocaleString(),
  }));
  const groupOptions: MultiSelectOption[] = groups.map((g) => ({
    value: String(g.id),
    label: g.name,
  }));

  const initialDueAt = defaultValues?.dueAt;
  const {
    control,
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      date: initialDueAt ?? null,
      time: initialDueAt
        ? { hour: initialDueAt.getHours(), minute: initialDueAt.getMinutes() }
        : { hour: 23, minute: 59 },
      sessionId: defaultValues?.sessionId != null ? String(defaultValues.sessionId) : null,
      acceptsFiles: Boolean(defaultValues?.maxFileSizeMb),
      maxFileSizeMb: defaultValues?.maxFileSizeMb ?? 10,
      allowedMimeCategories: defaultValues?.allowedMimeCategories ?? [],
      targetMode: defaultValues?.isAllGroups === false ? "groups" : "all",
      groupIds: defaultValues?.groupIds.map(String) ?? [],
    },
  });

  const targetMode = watch("targetMode");
  const acceptsFiles = watch("acceptsFiles");

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const dueAt = values.date
        ? (() => {
            const d = new Date(values.date);
            d.setHours(values.time.hour, values.time.minute, 0, 0);
            return d;
          })()
        : null;

      const payload: AssignmentInput = {
        title: values.title,
        description: values.description ?? null,
        dueAt,
        sessionId: values.sessionId ? Number(values.sessionId) : null,
        maxFileSizeMb: values.acceptsFiles ? values.maxFileSizeMb ?? 10 : null,
        allowedMimeCategories: values.acceptsFiles ? values.allowedMimeCategories : [],
        isAllGroups: values.targetMode === "all",
        groupIds: values.targetMode === "groups" ? values.groupIds.map(Number) : [],
      };

      const result =
        mode === "create"
          ? await createAssignmentAction(seasonId, payload)
          : await updateAssignmentAction(assignmentId!, payload);

      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        return;
      }
      router.push(`/admin/season/${seasonCode}/assignments`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <FormField label="Title" required error={errors.title?.message}>
        <Input {...register("title")} placeholder="e.g. Week 4 reflection" />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Instructions, prompts, expectations…"
            />
          )}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Due date" error={errors.date?.message}>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
        <FormField label="Due time" error={errors.time?.message}>
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <TimePicker value={field.value} onChange={field.onChange} minuteStep={15} />
            )}
          />
        </FormField>
      </div>

      <FormField
        label="Linked session"
        description="Optional — associate this assignment with a session on the calendar."
      >
        <Controller
          control={control}
          name="sessionId"
          render={({ field }) => (
            <Combobox
              options={sessionOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="No session"
              emptyMessage="No sessions for this season."
            />
          )}
        />
      </FormField>

      <fieldset className="rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium">File submissions</legend>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("acceptsFiles")} className="size-4" />
          Accept file uploads from students
        </label>
        {acceptsFiles && (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Max file size (MB)" error={errors.maxFileSizeMb?.message}>
              <Input
                type="number"
                min={1}
                max={100}
                {...register("maxFileSizeMb", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Allowed types">
              <Controller
                control={control}
                name="allowedMimeCategories"
                render={({ field }) => (
                  <MultiSelect
                    options={MIME_CATEGORIES}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Any type"
                  />
                )}
              />
            </FormField>
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium">Assign to</legend>
        <div className="mt-2 flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" value="all" {...register("targetMode")} className="size-4" />
            All students in this season
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" value="groups" {...register("targetMode")} className="size-4" />
            Specific groups
          </label>
        </div>
        {targetMode === "groups" && (
          <div className="mt-3">
            <FormField label="Groups" error={errors.groupIds?.message}>
              <Controller
                control={control}
                name="groupIds"
                render={({ field }) => (
                  <MultiSelect
                    options={groupOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick groups…"
                  />
                )}
              />
            </FormField>
          </div>
        )}
      </fieldset>

      {submitError && (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">{submitError}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create assignment" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
