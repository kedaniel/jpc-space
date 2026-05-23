"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-teal-100 font-semibold text-brand-navy-900",
  {
    variants: {
      size: {
        sm: "size-7 text-xs",
        md: "size-10 text-sm",
        lg: "size-12 text-base",
        xl: "size-16 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, className }))}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    />
  );
}

function AvatarGroup({
  className,
  children,
  max,
  ...props
}: React.ComponentProps<"div"> & { max?: number }) {
  const all = React.Children.toArray(children);
  const visible = max ? all.slice(0, max) : all;
  const overflow = max ? all.length - visible.length : 0;
  return (
    <div
      data-slot="avatar-group"
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {visible.map((child, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">
          {child}
        </div>
      ))}
      {overflow > 0 ? (
        <div className="ring-2 ring-white rounded-full">
          <Avatar size="md">
            <AvatarFallback>+{overflow}</AvatarFallback>
          </Avatar>
        </div>
      ) : null}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };
