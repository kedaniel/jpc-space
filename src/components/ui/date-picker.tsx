"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaInvalid?: boolean;
}

function getMonthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    days.push(new Date(d));
  }
  return days;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(value ?? new Date());
  const [trackedValue, setTrackedValue] = React.useState<Date | null>(value ?? null);
  if (value && (!trackedValue || value.getTime() !== trackedValue.getTime())) {
    setTrackedValue(value);
    setViewMonth(value);
  }

  const days = React.useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const today = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <span>{value ? format(value, "PPP") : placeholder}</span>
        <CalendarIcon className="size-4 text-muted-foreground" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} className="z-50">
          <PopoverPrimitive.Popup
            className="rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
          >
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Button>
              <div className="text-sm font-medium">
                {format(viewMonth, "MMMM yyyy")}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {weekdays.map((w) => (
                <div
                  key={w}
                  className="py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const isCurrentMonth = isSameMonth(d, viewMonth);
                const isSelected = value ? isSameDay(d, value) : false;
                const isToday = isSameDay(d, today);
                return (
                  <button
                    type="button"
                    key={d.toISOString()}
                    onClick={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isCurrentMonth && !isSelected && "hover:bg-muted",
                      isSelected &&
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isSelected &&
                        isToday &&
                        "ring-1 ring-inset ring-brand-teal-500",
                    )}
                  >
                    {format(d, "d")}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { DatePicker };
