import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BioDataCard, BioDataCardSkeleton } from "@/components/portal/bio-data-card";
import { DiagnosesHistory, DiagnosesHistorySkeleton } from "@/components/portal/diagnoses-history";
import { InvoicesSummary, InvoicesSummarySkeleton } from "@/components/portal/invoices-summary";
import { LabReportsSection, LabReportsSectionSkeleton } from "@/components/portal/lab-reports-section";
import { MedicationsList, MedicationsListSkeleton } from "@/components/portal/medications-list";
import { createClient } from "@/lib/supabase/server";

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
      <header id="overview" className="scroll-mt-20">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your Health Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A summary of your records, medications, and lab results.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Suspense fallback={<BioDataCardSkeleton />}>
            <BioDataCard patientId={patientId} />
          </Suspense>
        </div>
        <div id="financials" className="scroll-mt-20 lg:col-span-2">
          <Suspense fallback={<InvoicesSummarySkeleton />}>
            <InvoicesSummary patientId={patientId} />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div id="medications" className="scroll-mt-20">
          <Suspense fallback={<MedicationsListSkeleton />}>
            <MedicationsList patientId={patientId} />
          </Suspense>
        </div>
        <div id="diagnoses" className="scroll-mt-20">
          <Suspense fallback={<DiagnosesHistorySkeleton />}>
            <DiagnosesHistory patientId={patientId} />
          </Suspense>
        </div>
      </div>

      <div id="lab-reports" className="scroll-mt-20">
        <Suspense fallback={<LabReportsSectionSkeleton />}>
          <LabReportsSection patientId={patientId} />
        </Suspense>
      </div>
    </main>
  );
}
