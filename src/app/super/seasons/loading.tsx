import { SeasonsListSkeleton } from "@/components/seasons/seasons-list";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <SeasonsListSkeleton />
    </div>
  );
}
