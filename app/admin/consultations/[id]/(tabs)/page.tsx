import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PatientBiodataFull, PatientBiodataFullSkeleton } from "@/components/admin/patient-biodata-full";
import { PatientFolderView } from "@/components/admin/patient-folder-view";
import { PatientHistorySection } from "@/components/admin/patient-history-section";
import { PreviousConsultations, PreviousConsultationsSkeleton } from "@/components/admin/previous-consultations";
import { SuccessBanner } from "@/components/admin/success-banner";
import { DiagnosesHistory, DiagnosesHistorySkeleton } from "@/components/portal/diagnoses-history";
import { InvoicesSummary, InvoicesSummarySkeleton } from "@/components/portal/invoices-summary";
import { LabReportsSection, LabReportsSectionSkeleton } from "@/components/portal/lab-reports-section";
import { MedicationsList, MedicationsListSkeleton } from "@/components/portal/medications-list";
import { Button } from "@/components/ui/button";

export default async function ConsultationFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = await params;

  return (
    <PatientFolderView
      patientId={patientId}
      defaultTab="consultation"
      consultationsNode={
        <div className="space-y-6">
          <Suspense fallback={null}>
            <SuccessBanner param="recorded" message="Consultation recorded." />
          </Suspense>

          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<MedicationsListSkeleton />}>
              <MedicationsList patientId={patientId} />
            </Suspense>
            <Suspense fallback={<DiagnosesHistorySkeleton />}>
              <DiagnosesHistory patientId={patientId} />
            </Suspense>
          </div>

          <Suspense fallback={<LabReportsSectionSkeleton />}>
            <LabReportsSection patientId={patientId} />
          </Suspense>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Previous Consultations</h2>
            <Button asChild size="sm" className="shadow-xs shadow-primary/25">
              <Link href={`/admin/consultations/${patientId}/new`} prefetch={true} className="flex items-center gap-1.5">
                <NotebookPen className="size-3.5" />
                <span>New consultation</span>
              </Link>
            </Button>
          </div>

          <Suspense fallback={<PreviousConsultationsSkeleton />}>
            <PreviousConsultations patientId={patientId} />
          </Suspense>
        </div>
      }
      bioDataNode={
        <Suspense fallback={<PatientBiodataFullSkeleton />}>
          <PatientBiodataFull patientId={patientId} />
        </Suspense>
      }
      historyNode={
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/60" />}>
          <PatientHistorySection patientId={patientId} />
        </Suspense>
      }
      financialsNode={
        <Suspense fallback={<InvoicesSummarySkeleton />}>
          <InvoicesSummary patientId={patientId} isAdmin />
        </Suspense>
      }
    />
  );
}
