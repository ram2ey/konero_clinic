import { BioDataCardSkeleton } from "@/components/portal/bio-data-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientPortalLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Hero Banner Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
        </div>
      </div>

      {/* Segmented Tab Pill Skeleton */}
      <div className="overflow-x-auto pb-1">
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
      </div>

      <BioDataCardSkeleton />
    </main>
  );
}
