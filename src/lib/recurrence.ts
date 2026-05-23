import { addDays } from "date-fns";

export type RecurrenceScope = "one" | "future" | "all";

export function generateRecurringDates(
  start: Date,
  count: number,
  intervalDays = 7,
): Date[] {
  if (count < 1) return [start];
  return Array.from({ length: count }, (_, i) => addDays(start, i * intervalDays));
}

export interface SeriesSession {
  id: number;
  startsAt: Date;
}

export function siblingsInScope(
  series: SeriesSession[],
  anchor: SeriesSession,
  scope: RecurrenceScope,
): SeriesSession[] {
  if (scope === "one") return [anchor];
  if (scope === "all") return series;
  return series.filter((s) => s.startsAt.getTime() >= anchor.startsAt.getTime());
}
