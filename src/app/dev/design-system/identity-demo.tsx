"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { fadeUp, staggerParent } from "@/lib/motion";

export function IdentityDemo() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-6">
        <Logo size="sm" />
        <Logo size="md" />
        <Logo size="lg" />
      </div>
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border/60 bg-card p-4">
        <Logo size="md" showWordmark />
        <Logo size="lg" showWordmark />
      </div>
    </div>
  );
}

export function MotionDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setKey((k) => k + 1)}>Replay reveal</Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.success("Toast queued.", {
              description: "Sonner is wired up app-wide.",
            })
          }
        >
          Trigger toast
        </Button>
      </div>
      <motion.ul
        key={key}
        variants={staggerParent}
        initial="initial"
        animate="animate"
        className="grid gap-3 md:grid-cols-3"
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <motion.li key={n} variants={fadeUp}>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-teal-100 text-brand-teal-700 dark:bg-brand-teal-900 dark:text-brand-teal-200">
                  <Sparkles className="size-4" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  Card #{n}
                </span>
              </div>
            </Card>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function ElevationDemo() {
  const shadows = [
    {
      name: "soft",
      shadowClass: "shadow-[var(--shadow-soft)]",
      caption: "Cards at rest",
    },
    {
      name: "pop",
      shadowClass: "shadow-[var(--shadow-pop)]",
      caption: "Hover, popovers",
    },
    {
      name: "lift",
      shadowClass: "shadow-[var(--shadow-lift)]",
      caption: "Modal, FAB",
    },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {shadows.map((s) => (
        <div
          key={s.name}
          className={`rounded-2xl border border-border/60 bg-card p-6 ${s.shadowClass}`}
        >
          <p className="text-lg font-semibold tracking-tight">
            shadow-{s.name}
          </p>
          <p className="text-sm text-muted-foreground">{s.caption}</p>
        </div>
      ))}
    </div>
  );
}

export function ThemeDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Light & dark mode</CardTitle>
        <CardDescription>
          Tokens auto-switch via{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            next-themes
          </code>
          . The toggle lives in the top bar — duplicate here for convenience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeToggle size="icon" />
      </CardContent>
    </Card>
  );
}
