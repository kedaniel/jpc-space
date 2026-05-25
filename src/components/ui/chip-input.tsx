"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface ChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function ChipInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  disabled,
  invalid,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
}: ChipInputProps) {
  const [draft, setDraft] = React.useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      aria-invalid={invalid || undefined}
    >
      {value.map((v, i) => (
        <Badge key={`${v}-${i}`} variant="secondary" className="gap-1 pr-1 text-xs">
          {v}
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={disabled}
            aria-label={`Remove ${v}`}
            className="inline-flex size-4 items-center justify-center rounded-sm hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[6rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
