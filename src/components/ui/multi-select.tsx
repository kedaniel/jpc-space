"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  emptyMessage?: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled,
  invalid,
  emptyMessage = "No options.",
  className,
  id,
  "aria-describedby": ariaDescribedBy,
}: MultiSelectProps) {
  const [query, setQuery] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(v: string) {
    if (selectedSet.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  function clearOne(v: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((x) => x !== v));
  }

  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className,
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="px-1 text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((o) => (
            <Badge
              key={o.value}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {o.label}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${o.label}`}
                onClick={(e) => clearOne(o.value, e)}
                className="inline-flex size-4 cursor-pointer items-center justify-center rounded-sm hover:bg-neutral-200/60"
              >
                <X className="size-3" />
              </span>
            </Badge>
          ))
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} className="z-50">
          <PopoverPrimitive.Popup
            className={cn(
              "w-[var(--anchor-width)] max-w-[min(28rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            )}
          >
            <div className="p-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-sm border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="max-h-60 overflow-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((o) => {
                  const selected = selectedSet.has(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      )}
                    >
                      <span className="mt-0.5 inline-flex size-4 items-center justify-center rounded-sm border border-input">
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="flex-1">
                        <span className="block">{o.label}</span>
                        {o.description && (
                          <span className="block text-xs text-muted-foreground">
                            {o.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
