"use client";

import * as React from "react";
import { Field } from "@base-ui/react/field";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof Field.Label>) {
  return (
    <Field.Label
      data-slot="label"
      className={cn(
        "text-sm font-medium leading-none text-foreground select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
