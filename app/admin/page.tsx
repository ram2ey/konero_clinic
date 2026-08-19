import { Suspense } from "react";

import { OverviewStats, OverviewStatsSkeleton } from "@/components/admin/dashboard/overview-stats";
import { RecentActivity, RecentActivitySkeleton } from "@/components/admin/dashboard/recent-activity";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Admin Practice Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-violet-500/5 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <span>Dr. Alex Vico-Korda Practice</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Clinical Administration &amp; Insights
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Practice performance metrics, patient registration volume, active psychiatric consults, and billing ledger.
            </p>
          </div>
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
