import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("jpc-shimmer rounded-md", className)}
      {...props}
    />
  );
}

function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] md:p-6",
        className,
      )}
    >
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard };
