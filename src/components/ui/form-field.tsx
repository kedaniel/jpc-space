"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends React.ComponentProps<typeof Field> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

function FormField({
  label,
  description,
  error,
  required,
  className,
  children,
  ...rest
}: FormFieldProps) {
  return (
    <Field className={cn("flex flex-col gap-1.5", className)} {...rest}>
      {label ? (
        <Label>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export { FormField };
