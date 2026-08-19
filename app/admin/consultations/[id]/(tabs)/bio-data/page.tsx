import { Suspense } from "react";

import { PatientBiodataFull, PatientBiodataFullSkeleton } from "@/components/admin/patient-biodata-full";

export default async function BioDataTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  return (
    <Suspense fallback={<PatientBiodataFullSkeleton />}>
      <PatientBiodataFull patientId={patientId} />
    </Suspense>
  );
}
