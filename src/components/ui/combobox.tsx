"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  emptyMessage?: string;
  className?: string;
  id?: string;
  clearable?: boolean;
  "aria-describedby"?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled,
  invalid,
  emptyMessage = "No matches.",
  className,
  id,
  clearable = true,
  "aria-describedby": ariaDescribedBy,
}: ComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className,
        )}
      >
        <span
          className={cn(
            "truncate",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {clearable && selected && (
            <span
              role="button"
              aria-label="Clear"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="inline-flex size-5 cursor-pointer items-center justify-center rounded-sm hover:bg-muted"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown className="size-4" />
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} className="z-50">
          <PopoverPrimitive.Popup className="w-[var(--anchor-width)] max-w-[min(28rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none">
            <div className="p-1">
              <input
                autoFocus
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
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => select(o.value)}
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                  >
                    <span className="mt-0.5 inline-flex size-4 items-center justify-center">
                      {o.value === value && <Check className="size-3.5" />}
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
                ))
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
