"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function Modal(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function ModalTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger {...props} />;
}

function ModalClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) {
  return <DialogPrimitive.Close {...props} />;
}

function ModalContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          "transition-opacity duration-200 ease-[var(--ease-out-soft)]"
        )}
      />
      <DialogPrimitive.Popup
        data-slot="modal-content"
        className={cn(
          // Mobile (default): bottom sheet
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col gap-4 rounded-t-2xl border-t border-border bg-card p-4 shadow-[var(--shadow-lift)] outline-none",
          // Drag-affordance handle (decorative)
          "before:absolute before:left-1/2 before:top-2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-muted-foreground/30 md:before:hidden",
          // Mobile slide-up animation
          "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
          "transition-transform duration-300 ease-[var(--ease-out-soft)]",
          // Desktop (md+): centered dialog
          "md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:p-6",
          "md:data-[starting-style]:translate-x-[-50%] md:data-[starting-style]:translate-y-[calc(-50%+8px)] md:data-[starting-style]:scale-[0.96] md:data-[starting-style]:opacity-0",
          "md:data-[ending-style]:translate-x-[-50%] md:data-[ending-style]:translate-y-[calc(-50%+8px)] md:data-[ending-style]:scale-[0.98] md:data-[ending-style]:opacity-0",
          "md:transition-[transform,opacity] md:duration-200",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 outline-none"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-header"
      className={cn("flex flex-col gap-1 pr-8", className)}
      {...props}
    />
  );
}

function ModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight md:text-xl",
        className,
      )}
      {...props}
    />
  );
}

function ModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
};
