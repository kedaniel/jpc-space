import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function AlumniLoading() {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <Skeleton className="h-32 rounded-2xl" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
