"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: { hour: number; minute: number };
  onChange: (next: { hour: number; minute: number }) => void;
  className?: string;
  disabled?: boolean;
  minuteStep?: 5 | 10 | 15 | 30;
}

const pad = (n: number) => n.toString().padStart(2, "0");

function TimePicker({
  value,
  onChange,
  className,
  disabled,
  minuteStep = 5,
}: TimePickerProps) {
  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = React.useMemo(
    () => Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={pad(value.hour)}
        onValueChange={(v) => onChange({ ...value, hour: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[88px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={pad(h)}>
              {pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={pad(value.minute)}
        onValueChange={(v) => onChange({ ...value, minute: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[88px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={pad(m)}>
              {pad(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { TimePicker };
