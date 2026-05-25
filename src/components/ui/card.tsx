import * as React from "react";

import { cn } from "@/lib/utils";

interface CardProps extends React.ComponentProps<"div"> {
  interactive?: boolean;
}

function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-border/60 bg-card text-card-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-soft)]",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] hover:border-border",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-4 md:p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-base font-semibold leading-tight tracking-tight md:text-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-4 pt-0 md:p-6 md:pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 border-t border-border/60 p-4 md:p-6",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
