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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Patient Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 border-l-4 border-l-primary bg-gradient-to-r from-primary/10 via-primary/4 to-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Patient Health Portal
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Securely access your medical profile, active prescriptions, clinical diagnoses, and diagnostic reports at <span className="font-semibold text-primary">Konero Clinic</span>.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="size-4 shrink-0 text-muted-foreground group-data-[state=active]:text-primary" />
              <span>{tab.label}</span>
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
