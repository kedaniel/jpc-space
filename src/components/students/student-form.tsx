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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  createStudentAction,
  updateStudentProfileAction,
  type StudentProfileInput,
} from "@/lib/student-actions";

const schema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Valid email required."),
  university: z.string().optional(),
  year: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().nullable().optional(),
  spiritualBackground: z.string().optional(),
  gifts: z.string().optional(),
  notes: z.string().optional(),
  activeSeasonId: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export interface StudentFormProps {
  mode: "create" | "edit";
  studentUserId?: number;
  isSelf?: boolean; // student editing own profile — hides notes/season fields
  seasons: { id: number; title: string }[];
  defaultValues?: {
    name: string;
    email: string;
    university: string | null;
    year: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    spiritualBackground: string | null;
    gifts: string | null;
    notes: string | null;
    activeSeasonId: number | null;
  };
  redirectTo?: string;
}

export function StudentForm({
  mode,
  studentUserId,
  isSelf,
  seasons,
  defaultValues,
  redirectTo,
}: StudentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const seasonOptions: ComboboxOption[] = seasons.map((s) => ({
    value: String(s.id),
    label: s.title,
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
      email: defaultValues?.email ?? "",
      university: defaultValues?.university ?? "",
      year: defaultValues?.year ?? "",
      phone: defaultValues?.phone ?? "",
      dateOfBirth: defaultValues?.dateOfBirth ?? null,
      spiritualBackground: defaultValues?.spiritualBackground ?? "",
      gifts: defaultValues?.gifts ?? "",
      notes: defaultValues?.notes ?? "",
      activeSeasonId:
        defaultValues?.activeSeasonId != null
          ? String(defaultValues.activeSeasonId)
          : null,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const payload: StudentProfileInput = {
        name: values.name,
        email: values.email,
        university: values.university || null,
        year: values.year || null,
        phone: values.phone || null,
        dateOfBirth: values.dateOfBirth ?? null,
        spiritualBackground: values.spiritualBackground || null,
        gifts: values.gifts || null,
        notes: values.notes || null,
        activeSeasonId: values.activeSeasonId ? Number(values.activeSeasonId) : null,
      };

      const result =
        mode === "create"
          ? await createStudentAction(payload)
          : await updateStudentProfileAction(studentUserId!, payload);

      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Section title="Personal">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Full name" required error={errors.name?.message}>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Date of birth" error={errors.dateOfBirth?.message}>
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <DatePicker value={field.value ?? null} onChange={field.onChange} />
              )}
            />
          </FormField>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </FormField>
        </div>
      </Section>

      <Section title="Academic">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="University" error={errors.university?.message}>
            <Input {...register("university")} />
          </FormField>
          <FormField label="Year / faculty" error={errors.year?.message}>
            <Input placeholder="e.g. 3rd · Engineering" {...register("year")} />
          </FormField>
        </div>
      </Section>

      <Section title="Spiritual background">
        <FormField label="Notes" error={errors.spiritualBackground?.message}>
          <Textarea
            rows={3}
            {...register("spiritualBackground")}
            placeholder="Church affiliation, baptism status, faith journey…"
          />
        </FormField>
      </Section>

      <Section title="Community">
        <FormField label="Gifts / interests" error={errors.gifts?.message}>
          <Textarea
            rows={2}
            {...register("gifts")}
            placeholder="e.g. worship, hospitality, mentoring younger students"
          />
        </FormField>
      </Section>

      {!isSelf && (
        <Section title="Admin only">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Active season"
              description="The season the student is currently enrolled in."
            >
              <Controller
                control={control}
                name="activeSeasonId"
                render={({ field }) => (
                  <Combobox
                    options={seasonOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="None"
                  />
                )}
              />
            </FormField>
          </div>
          <FormField
            label="Internal notes"
            description="Visible to leaders, mentors, and admins. The student does not see these."
            error={errors.notes?.message}
          >
            <Textarea rows={3} {...register("notes")} />
          </FormField>
        </Section>
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
          {pending ? "Saving…" : mode === "create" ? "Create student" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-neutral-200 bg-white p-4 md:p-6">
      <legend className="px-1 text-sm font-semibold text-foreground">{title}</legend>
      <div className="mt-2 flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}
