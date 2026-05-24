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
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import {
  createGroupAction,
  updateGroupAction,
  type GroupInput,
} from "@/lib/group-actions";

const schema = z.object({
  name: z.string().min(2, "Name is required."),
  description: z.string().max(2000).optional(),
  leaderIds: z.array(z.string()),
  studentIds: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

export interface GroupFormProps {
  mode: "create" | "edit";
  seasonId: number;
  seasonCode: string;
  groupId?: number;
  leaders: { id: number; name: string | null; email: string }[];
  students: { id: number; name: string | null; email: string }[];
  defaultValues?: {
    name: string;
    description: string | null;
    leaderIds: number[];
    studentIds: number[];
  };
}

export function GroupForm({
  mode,
  seasonId,
  seasonCode,
  groupId,
  leaders,
  students,
  defaultValues,
}: GroupFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const leaderOptions: MultiSelectOption[] = leaders.map((u) => ({
    value: String(u.id),
    label: u.name ?? u.email,
    description: u.email,
  }));
  const studentOptions: MultiSelectOption[] = students.map((u) => ({
    value: String(u.id),
    label: u.name ?? u.email,
    description: u.email,
  }));

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      leaderIds: defaultValues?.leaderIds.map(String) ?? [],
      studentIds: defaultValues?.studentIds.map(String) ?? [],
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const payload: GroupInput = {
        name: values.name,
        description: values.description ?? null,
        leaderIds: values.leaderIds.map(Number),
        studentIds: values.studentIds.map(Number),
      };
      const result =
        mode === "create"
          ? await createGroupAction(seasonId, payload)
          : await updateGroupAction(groupId!, payload);

      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        return;
      }
      router.push(`/admin/season/${seasonCode}/groups`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <FormField label="Name" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="e.g. Alpha" />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          rows={3}
          placeholder="Optional context shown on the group page."
        />
      </FormField>

      <FormField
        label="Leaders"
        description="Choose one or more leaders for this group."
        error={errors.leaderIds?.message}
      >
        <Controller
          control={control}
          name="leaderIds"
          render={({ field }) => (
            <MultiSelect
              options={leaderOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick leaders…"
              emptyMessage="No leaders found."
            />
          )}
        />
      </FormField>

      <FormField
        label="Students"
        description="Students enrolled in this group for the current season. Adding a student here will move them out of any other group."
        error={errors.studentIds?.message}
      >
        <Controller
          control={control}
          name="studentIds"
          render={({ field }) => (
            <MultiSelect
              options={studentOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick students…"
              emptyMessage="No students found."
            />
          )}
        />
      </FormField>

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
          {pending ? "Saving…" : mode === "create" ? "Create group" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
