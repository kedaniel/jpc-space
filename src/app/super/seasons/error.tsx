"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TriangleAlert } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong loading seasons"
        description="Try again, or contact support if the issue persists."
        action={
          <Button variant="outline" onClick={reset}>
            Retry
          </Button>
        }
      />
    </div>
  );
}
