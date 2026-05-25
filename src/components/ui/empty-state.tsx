import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center md:py-16",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="relative inline-flex">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-brand-teal-200/40 blur-xl dark:bg-brand-teal-900/60"
          />
          <div className="inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal-100 to-brand-teal-200 text-brand-navy-900 ring-1 ring-inset ring-brand-teal-300/60 dark:from-brand-teal-900 dark:to-brand-navy-900 dark:text-brand-teal-200 dark:ring-brand-teal-800/60">
            <Icon className="size-6" />
          </div>
        </div>
      ) : null}
      <div className="flex max-w-md flex-col gap-1.5">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
