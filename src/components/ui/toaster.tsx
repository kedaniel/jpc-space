"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group !rounded-xl !border !border-border !bg-card !text-foreground !shadow-[var(--shadow-pop)]",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
