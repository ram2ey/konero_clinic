import { FileText, LayoutDashboard, Pill, Receipt, Stethoscope } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BioDataCard, BioDataCardSkeleton } from "@/components/portal/bio-data-card";
import { DiagnosesHistory, DiagnosesHistorySkeleton } from "@/components/portal/diagnoses-history";
import { InvoicesSummary, InvoicesSummarySkeleton } from "@/components/portal/invoices-summary";
import { LabReportsSection, LabReportsSectionSkeleton } from "@/components/portal/lab-reports-section";
import { MedicationsList, MedicationsListSkeleton } from "@/components/portal/medications-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "medications", label: "Medications", icon: Pill },
  { value: "diagnoses", label: "Diagnoses", icon: Stethoscope },
  { value: "financials", label: "Financials", icon: Receipt },
  { value: "lab-reports", label: "Lab Reports", icon: FileText },
];

export default async function PatientPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt and suspenders — middleware already redirects unauthenticated
  // requests away from /portal before this ever runs.
  if (!user) {
    redirect("/login");
  }

  const patientId = user.id;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your Health Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A summary of your records, medications, and lab results.
        </p>
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
            in parallel, on page load, same as before this was tabbed;
            switching tabs just toggles visibility instead of re-fetching. */}
        <TabsContent value="overview" forceMount>
          <Suspense fallback={<BioDataCardSkeleton />}>
            <BioDataCard patientId={patientId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="medications" forceMount>
          <Suspense fallback={<MedicationsListSkeleton />}>
            <MedicationsList patientId={patientId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="diagnoses" forceMount>
          <Suspense fallback={<DiagnosesHistorySkeleton />}>
            <DiagnosesHistory patientId={patientId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="financials" forceMount>
          <Suspense fallback={<InvoicesSummarySkeleton />}>
            <InvoicesSummary patientId={patientId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="lab-reports" forceMount>
          <Suspense fallback={<LabReportsSectionSkeleton />}>
            <LabReportsSection patientId={patientId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}
