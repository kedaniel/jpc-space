"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { reviewSubmissionAction } from "@/lib/submission-actions";

interface SubmissionReviewFormProps {
  submissionId: number;
  initialFeedback: string;
  alreadyReviewed: boolean;
}

export function SubmissionReviewForm({
  submissionId,
  initialFeedback,
  alreadyReviewed,
}: SubmissionReviewFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = React.useState(initialFeedback);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await reviewSubmissionAction(submissionId, feedback);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {alreadyReviewed ? "Update feedback" : "Add feedback"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RichTextEditor
          value={feedback}
          onChange={setFeedback}
          placeholder="What did the student do well? What could be stronger?"
        />
        {error && (
          <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-800">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : alreadyReviewed ? "Update review" : "Mark as reviewed"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
