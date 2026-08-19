import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { DiagnosesHistory, DiagnosesHistorySkeleton } from "@/components/portal/diagnoses-history";
import { LabReportsSection, LabReportsSectionSkeleton } from "@/components/portal/lab-reports-section";
import { MedicationsList, MedicationsListSkeleton } from "@/components/portal/medications-list";
import { PreviousConsultations, PreviousConsultationsSkeleton } from "@/components/admin/previous-consultations";
import { SuccessBanner } from "@/components/admin/success-banner";
import { Button } from "@/components/ui/button";

export default async function ConsultationTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  return (
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
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Previous Consultations</h2>
        <Button asChild size="sm">
          <Link href={`/admin/consultations/${patientId}/new`}>
            <NotebookPen className="size-3.5" />
            New consultation
          </Link>
        </Button>
      </div>

      <Suspense fallback={<PreviousConsultationsSkeleton />}>
        <PreviousConsultations patientId={patientId} />
      </Suspense>
    </div>
  );
}
