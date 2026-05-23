"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: string;
  showValue?: boolean;
}

function Progress({
  className,
  value,
  label,
  showValue,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label ? (
            <ProgressPrimitive.Label className="font-medium text-neutral-700">
              {label}
            </ProgressPrimitive.Label>
          ) : (
            <span />
          )}
          {showValue ? (
            <ProgressPrimitive.Value className="text-neutral-500 tabular-nums">
              {(formatted) => `${formatted ?? value ?? 0}`}
            </ProgressPrimitive.Value>
          ) : null}
        </div>
      )}
      <ProgressPrimitive.Track className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <ProgressPrimitive.Indicator className="h-full bg-brand-teal-500 transition-[width] duration-300" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
