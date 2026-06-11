"use client";

import { useState, useTransition } from "react";
import { saveQuizGradesAction } from "@/lib/quiz-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GradeRow {
  studentUserId: number;
  studentName: string;
  score: number | null;
  notes: string | null;
}

interface Props {
  quizId: number;
  maxScore: number;
  initialGrades: GradeRow[];
}

export function QuizGradeForm({ quizId, maxScore, initialGrades }: Props) {
  const [grades, setGrades] = useState<GradeRow[]>(initialGrades);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setScore(userId: number, raw: string) {
    const val = raw === "" ? null : Math.min(maxScore, Math.max(0, parseInt(raw, 10)));
    setGrades((prev) =>
      prev.map((g) => (g.studentUserId === userId ? { ...g, score: isNaN(val as number) ? null : val } : g)),
    );
    setSaved(false);
  }

  function setNotes(userId: number, val: string) {
    setGrades((prev) =>
      prev.map((g) => (g.studentUserId === userId ? { ...g, notes: val || null } : g)),
    );
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveQuizGradesAction(
        quizId,
        grades.map((g) => ({ studentUserId: g.studentUserId, score: g.score, notes: g.notes })),
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  const gradedCount = grades.filter((g) => g.score !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="px-4 py-3 text-left font-semibold text-brand-navy-900">Student</th>
              <th className="w-32 px-4 py-3 text-left font-semibold text-brand-navy-900">
                Score <span className="font-normal text-neutral-400">/ {maxScore}</span>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-brand-navy-900">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {grades.map((g) => (
              <tr key={g.studentUserId}>
                <td className="px-4 py-3 font-medium text-brand-navy-900">{g.studentName}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    size="sm"
                    min={0}
                    max={maxScore}
                    value={g.score ?? ""}
                    onChange={(e) => setScore(g.studentUserId, e.target.value)}
                    placeholder="-"
                    className="w-24"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    size="sm"
                    value={g.notes ?? ""}
                    onChange={(e) => setNotes(g.studentUserId, e.target.value)}
                    placeholder="Optional note..."
                    className="max-w-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save grades"}
        </Button>
        <span className="text-sm text-neutral-500">
          {gradedCount} / {grades.length} graded
        </span>
        {saved && <span className="text-sm font-semibold text-success-700">Saved</span>}
        {error && <span className="text-sm text-error-600">{error}</span>}
      </div>
    </div>
  );
}
