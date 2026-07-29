"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/generated/prisma/enums";
import { roleRequiresAlumnus } from "@/lib/roles";
import {
  createUserAction,
  updateUserAction,
  deactivateUserAction,
  reactivateUserAction,
} from "@/lib/user-actions";

const CURRENT_YEAR = new Date().getFullYear();

const schema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum([
      UserRole.SUPER,
      UserRole.ADMIN,
      UserRole.LEADER,
      UserRole.MENTOR,
      UserRole.STUDENT,
    ]),
    // Kept as a string in the form (number <input> registers a string); parsed to a
    // number on submit. Empty means "no graduation year".
    graduationYear: z
      .string()
      .refine((v) => v === "" || /^\d{4}$/.test(v), { message: "Enter a 4-digit year." })
      .refine(
        (v) => {
          if (v === "") return true;
          const n = Number(v);
          return n >= 1990 && n <= CURRENT_YEAR;
        },
        { message: `Year must be between 1990 and ${CURRENT_YEAR}.` },
      ),
  })
  .refine((v) => !roleRequiresAlumnus(v.role) || v.graduationYear !== "", {
    message: "Required — this role is for alumni only.",
    path: ["graduationYear"],
  });

type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.SUPER, label: "Super" },
  { value: UserRole.ADMIN, label: "Admin" },
  { value: UserRole.LEADER, label: "Leader" },
  { value: UserRole.MENTOR, label: "Mentor" },
  { value: UserRole.STUDENT, label: "Student" },
];

export interface UserFormProps {
  mode: "create" | "edit";
  userId?: number;
  isInactive?: boolean;
  defaultValues?: { name: string; email: string; role: UserRole; graduationYear: number | null };
}

export function UserForm({ mode, userId, isInactive, defaultValues }: UserFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      role: defaultValues?.role ?? UserRole.STUDENT,
      graduationYear: defaultValues?.graduationYear != null ? String(defaultValues.graduationYear) : "",
    },
  });
  const roleValue = watch("role");

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    const graduationYear = values.graduationYear === "" ? null : Number(values.graduationYear);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createUserAction({ name: values.name, email: values.email, role: values.role, graduationYear })
          : await updateUserAction(userId!, values.name, values.role, graduationYear);
      if (!result.ok) {
        setSubmitError(result.error);
        if (result.fieldErrors) {
          for (const [k, v] of Object.entries(result.fieldErrors)) {
            setError(k as keyof FormValues, { message: v });
          }
        }
        return;
      }
      router.push("/super/users");
      router.refresh();
    });
  });

  function deactivate() {
    startTransition(async () => {
      await deactivateUserAction(userId!);
    });
  }

  function reactivate() {
    startTransition(async () => {
      const result = await reactivateUserAction(userId!);
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <FormField label="Email" required error={errors.email?.message}>
          <Input
            type="email"
            disabled={mode === "edit"}
            {...register("email")}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Role" required error={errors.role?.message}>
          <Select value={roleValue} onValueChange={(v) => setValue("role", v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="JPCS graduation year"
          required={roleRequiresAlumnus(roleValue)}
          description={
            roleRequiresAlumnus(roleValue)
              ? "Leaders, admins, and mentors must be JPCS alumni."
              : "Optional — set if this person has graduated from JPCS."
          }
          error={errors.graduationYear?.message}
        >
          <Input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 2020"
            {...register("graduationYear")}
          />
        </FormField>
      </div>

      {mode === "create" && (
        <p className="rounded-md bg-info-50 px-3 py-2 text-sm text-info-800">
          New users get the temp password <code>ChangeMe123!</code> (logged to console).
          Replace with invite tokens — see TODO.md.
        </p>
      )}

      {submitError && (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">{submitError}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        {mode === "edit" && !isInactive && (
          <Button
            type="button"
            variant="destructive"
            onClick={deactivate}
            disabled={pending}
          >
            Deactivate
          </Button>
        )}
        {mode === "edit" && isInactive && (
          <Button
            type="button"
            variant="outline"
            onClick={reactivate}
            disabled={pending}
          >
            Reactivate
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
