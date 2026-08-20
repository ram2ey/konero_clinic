import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ConsultationSnippets, ConsultationSnippetsSkeleton } from "@/components/admin/consultation-snippets";
import { PatientBiodataFull, PatientBiodataFullSkeleton } from "@/components/admin/patient-biodata-full";
import { PatientFolderView } from "@/components/admin/patient-folder-view";
import { PatientHistorySection, PatientHistorySectionSkeleton } from "@/components/admin/patient-history-section";
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
      defaultTab="overview"
      overviewNode={
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<MedicationsListSkeleton />}>
              <MedicationsList patientId={patientId} />
            </Suspense>
            <Suspense fallback={<DiagnosesHistorySkeleton />}>
              <DiagnosesHistory patientId={patientId} />
            </Suspense>
          </div>

          <Suspense fallback={<LabReportsSectionSkeleton />}>
            <LabReportsSection patientId={patientId} showUpload={false} />
          </Suspense>

          <Suspense fallback={<ConsultationSnippetsSkeleton />}>
            <ConsultationSnippets patientId={patientId} />
          </Suspense>
        </div>
      }
      consultationsNode={
        <div className="space-y-6">
          <Suspense fallback={null}>
            <SuccessBanner param="recorded" message="Consultation recorded." />
          </Suspense>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Clinical Consultations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record new clinical visits, view complete consultation histories, and upload diagnostic lab reports.
              </p>
            </div>
            <Button asChild size="sm" className="shadow-xs shadow-primary/25">
              <Link href={`/admin/consultations/${patientId}/new`} prefetch={true} className="flex items-center gap-1.5">
                <NotebookPen className="size-3.5" />
                <span>New consultation</span>
              </Link>
            </Button>
          </div>

          <Suspense fallback={<LabReportsSectionSkeleton />}>
            <LabReportsSection patientId={patientId} showUpload={true} />
          </Suspense>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Previous Consultation Records</h3>
            <Suspense fallback={<PreviousConsultationsSkeleton />}>
              <PreviousConsultations patientId={patientId} />
            </Suspense>
          </div>
        </div>
      }
      bioDataNode={
        <Suspense fallback={<PatientBiodataFullSkeleton />}>
          <PatientBiodataFull patientId={patientId} />
        </Suspense>
      }
      historyNode={
        <Suspense fallback={<PatientHistorySectionSkeleton />}>
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

