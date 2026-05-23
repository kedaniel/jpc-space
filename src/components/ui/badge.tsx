import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "bg-success-100 text-success-800",
        warning: "bg-warning-100 text-warning-800",
        error: "bg-error-100 text-error-800",
        info: "bg-info-100 text-info-800",
      },
      role: {
        none: "",
        super: "bg-role-super text-role-super-foreground",
        admin: "bg-role-admin text-role-admin-foreground",
        leader: "bg-role-leader text-role-leader-foreground",
        mentor: "bg-role-mentor text-role-mentor-foreground",
        student: "bg-role-student text-role-student-foreground",
      },
    },
    defaultVariants: { variant: "default", role: "none" },
  }
);

export interface BadgeProps
  extends Omit<React.ComponentProps<"span">, "role">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, role, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, role, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
