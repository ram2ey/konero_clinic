import { CalendarClock, LayoutDashboard, Receipt } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BillingSnapshot, BillingSnapshotSkeleton } from "@/components/admin/dashboard/billing-snapshot";
import { OverviewStats, OverviewStatsSkeleton } from "@/components/admin/dashboard/overview-stats";
import { RecentPatients, RecentPatientsSkeleton } from "@/components/admin/dashboard/recent-patients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "consultations", label: "Consultations", icon: CalendarClock },
  { value: "billing", label: "Billing", icon: Receipt },
];

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Analytics and at-a-glance stats for the clinic.</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <span className="flex items-center gap-1.5">
                <tab.icon className="size-3.5" />
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* forceMount + the base TabsContent's data-[state=inactive]:hidden
            (see components/ui/tabs.tsx) — every tab's data streams in once,
            in parallel, on page load; switching tabs just toggles
            visibility instead of re-fetching. */}
        <TabsContent value="overview" forceMount>
          <Suspense fallback={<OverviewStatsSkeleton />}>
            <OverviewStats />
          </Suspense>
        </TabsContent>

        <TabsContent value="consultations" forceMount className="space-y-6">
          <div className="max-w-sm">
            <Link href="/admin/consultations">
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    Consultations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Register a new patient, search the roster, or open a patient&apos;s folder.
                </CardContent>
              </Card>
            </Link>
          </div>

          <Suspense fallback={<RecentPatientsSkeleton />}>
            <RecentPatients />
          </Suspense>
        </TabsContent>

        <TabsContent value="billing" forceMount>
          <Suspense fallback={<BillingSnapshotSkeleton />}>
            <BillingSnapshot />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}
