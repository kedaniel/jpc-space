import { format } from "date-fns";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { SeasonHistoryRow } from "@/lib/season-history-query";

interface SeasonHistoryProps {
  rows: SeasonHistoryRow[];
  emptyDescription?: string;
}

export function SeasonHistory({ rows, emptyDescription }: SeasonHistoryProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No past seasons"
        description={emptyDescription ?? "Completed seasons will appear here."}
      />
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {rows.map((s) => (
        <li key={s.seasonId}>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold text-brand-navy-900 dark:text-foreground">
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(s.startDate, "MMM d, yyyy")} – {format(s.endDate, "MMM d, yyyy")}
                  {s.groupName && ` · ${s.groupName}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="teal">{s.attendancePct}% attended</Badge>
                <Badge variant="success">Participated</Badge>
              </div>
            </div>

            {s.curriculum.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-brand-navy-700 dark:text-brand-navy-200">
                  Curriculum ({s.curriculum.length} sessions)
                </summary>
                <ol className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  {s.curriculum.map((session) => (
                    <li
                      key={session.id}
                      className="flex justify-between gap-3 border-t border-border pt-1 first:border-0 first:pt-0"
                    >
                      <span>{session.title}</span>
                      <span className="shrink-0 text-xs tabular-nums">
                        {format(session.startsAt, "MMM d, yyyy")}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
