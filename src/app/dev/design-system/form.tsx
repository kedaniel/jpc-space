"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Enter a valid email"),
  role: z.enum(["ADMIN", "LEADER", "MENTOR", "STUDENT"]),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function DesignSystemForm() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "STUDENT", notes: "" },
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field>
        <Label>Name</Label>
        <Input
          {...register("name")}
          placeholder="Jane Doe"
          aria-invalid={errors.name ? true : undefined}
        />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>
      <Field>
        <Label>Email</Label>
        <Input
          type="email"
          {...register("email")}
          placeholder="jane@example.com"
          aria-invalid={errors.email ? true : undefined}
        />
        <FieldDescription>We never share your email.</FieldDescription>
        <FieldError>{errors.email?.message}</FieldError>
      </Field>
      <Field className="md:col-span-1">
        <Label>Role</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v as FormValues["role"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LEADER">Leader</SelectItem>
                <SelectItem value="MENTOR">Mentor</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{errors.role?.message}</FieldError>
      </Field>
      <Field className="md:col-span-2">
        <Label>Notes</Label>
        <Textarea
          {...register("notes")}
          placeholder="Optional notes…"
          aria-invalid={errors.notes ? true : undefined}
        />
        <FieldError>{errors.notes?.message}</FieldError>
      </Field>
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
