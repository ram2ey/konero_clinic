import { Suspense } from "react";

import { InvoicesSummary, InvoicesSummarySkeleton } from "@/components/portal/invoices-summary";

export default async function FinancialsTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  return (
    <Suspense fallback={<InvoicesSummarySkeleton />}>
      <InvoicesSummary patientId={patientId} />
    </Suspense>
  );
}
