"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle({
  className,
  size = "icon-sm",
}: {
  className?: string;
  size?: "icon" | "icon-sm";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      <span className="relative inline-flex size-4 items-center justify-center">
        <AnimatePresence initial={false} mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="size-4" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -45, scale: 0.8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </Button>
  );
}
