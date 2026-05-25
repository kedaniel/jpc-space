import * as React from "react";

import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/generated/prisma/enums";

const map: Record<SubmissionStatus, { label: string; classes: string }> = {
  DRAFT: {
    label: "Draft",
    classes:
      "bg-muted text-muted-foreground dark:bg-neutral-800 dark:text-neutral-300",
  },
  SUBMITTED: {
    label: "Submitted",
    classes:
      "bg-info-100 text-info-800 dark:bg-info-950 dark:text-info-200",
  },
  REVIEWED: {
    label: "Reviewed",
    classes:
      "bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-200",
  },
  RETURNED: {
    label: "Returned",
    classes:
      "bg-warning-100 text-warning-800 dark:bg-warning-950 dark:text-warning-200",
  },
};

interface SubmissionStatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "role"> {
  status: SubmissionStatus;
}

function SubmissionStatusBadge({
  status,
  className,
  ...props
}: SubmissionStatusBadgeProps) {
  const entry = map[status];
  return (
    <span
      data-slot="submission-status-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        entry.classes,
        className
      )}
      {...props}
    >
      {entry.label}
    </span>
  );
}

export { SubmissionStatusBadge };
