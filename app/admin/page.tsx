import { Suspense } from "react";

import { OverviewStats, OverviewStatsSkeleton } from "@/components/admin/dashboard/overview-stats";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Analytics and at-a-glance stats for the clinic.</p>
      </header>

      <Suspense fallback={<OverviewStatsSkeleton />}>
        <OverviewStats />
      </Suspense>
    </main>
  );
}
