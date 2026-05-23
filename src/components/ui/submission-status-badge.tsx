import * as React from "react";

import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/generated/prisma/enums";

const map: Record<SubmissionStatus, { label: string; classes: string }> = {
  DRAFT: { label: "Draft", classes: "bg-neutral-100 text-neutral-700" },
  SUBMITTED: { label: "Submitted", classes: "bg-info-100 text-info-800" },
  REVIEWED: { label: "Reviewed", classes: "bg-success-100 text-success-800" },
  RETURNED: { label: "Returned", classes: "bg-warning-100 text-warning-800" },
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
