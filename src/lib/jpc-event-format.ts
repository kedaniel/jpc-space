import { format } from "date-fns";

function hasTime(d: Date): boolean {
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

function formatOne(d: Date): string {
  return format(d, hasTime(d) ? "EEE, MMM d, yyyy · h:mm a" : "EEE, MMM d, yyyy");
}

/** Human-readable "when" for a JPC event: single date/time, a same-day time range, or a multi-day range. */
export function formatJpcEventWhen(start: Date, end: Date | null): string {
  if (!end) return formatOne(start);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return hasTime(start) || hasTime(end)
      ? `${format(start, "EEE, MMM d, yyyy · h:mm a")} – ${format(end, "h:mm a")}`
      : formatOne(start);
  }
  return `${formatOne(start)} – ${formatOne(end)}`;
}
