import * as React from "react";
import { Check, Clock, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/generated/prisma/enums";

const map: Record<
  AttendanceStatus,
  { label: string; classes: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PRESENT: {
    label: "Present",
    classes: "bg-success-100 text-success-800",
    icon: Check,
  },
  ABSENT: {
    label: "Absent",
    classes: "bg-error-100 text-error-800",
    icon: X,
  },
  EXCUSED: {
    label: "Excused",
    classes: "bg-info-100 text-info-800",
    icon: Minus,
  },
  LATE: {
    label: "Late",
    classes: "bg-warning-100 text-warning-800",
    icon: Clock,
  },
};

interface AttendancePillProps extends Omit<React.ComponentProps<"span">, "role"> {
  status: AttendanceStatus;
}

function AttendancePill({ status, className, ...props }: AttendancePillProps) {
  const entry = map[status];
  const Icon = entry.icon;
  return (
    <span
      data-slot="attendance-pill"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        entry.classes,
        className
      )}
      {...props}
    >
      <Icon className="size-3" />
      {entry.label}
    </span>
  );
}

export { AttendancePill };
