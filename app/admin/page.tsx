import { Suspense } from "react";

import { OverviewStats, OverviewStatsSkeleton } from "@/components/admin/dashboard/overview-stats";
import { RecentActivity, RecentActivitySkeleton } from "@/components/admin/dashboard/recent-activity";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Admin Practice Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 border-l-4 border-l-primary bg-gradient-to-r from-primary/10 via-primary/4 to-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Clinical Administration &amp; Insights
          </h1>
        </div>
      </div>

      <Suspense fallback={<OverviewStatsSkeleton />}>
        <OverviewStats />
      </Suspense>

      <Suspense fallback={<RecentActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </main>
  );
}
