import { BioDataCardSkeleton } from "@/components/portal/bio-data-card";
import { DiagnosesHistorySkeleton } from "@/components/portal/diagnoses-history";
import { InvoicesSummarySkeleton } from "@/components/portal/invoices-summary";
import { LabReportsSectionSkeleton } from "@/components/portal/lab-reports-section";
import { MedicationsListSkeleton } from "@/components/portal/medications-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientPortalLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </header>

      <BioDataCardSkeleton />
      <InvoicesSummarySkeleton />

      <div className="grid gap-6 lg:grid-cols-2">
        <MedicationsListSkeleton />
        <DiagnosesHistorySkeleton />
      </div>

      <LabReportsSectionSkeleton />
    </main>
  );
}
