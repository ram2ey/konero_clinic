import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PatientTabs } from "@/components/admin/patient-tabs";
import { createClient } from "@/lib/supabase/server";

// Its own Suspense boundary rather than an await at the top of the layout:
// unsuspended, this query would block React from starting *any* of
// {children} until the patient's name resolved — including the tab page's
// own Medications/Diagnoses/Lab-reports/Previous-consultations queries,
// which have nothing to do with this fetch. Splitting it out lets both run
// concurrently instead of back-to-back.
async function PatientHeading({ patientId }: { patientId: string }) {
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", patientId)
    .eq("role", "patient")
    .single<{ full_name: string | null }>();

  if (!patient) {
    notFound();
  }

  return (
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
      {patient.full_name ?? "Unnamed patient"}
    </h1>
  );
}

function PatientHeadingSkeleton() {
  return <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />;
}

export default async function PatientFolderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = await params;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <Suspense fallback={<PatientHeadingSkeleton />}>
          <PatientHeading patientId={patientId} />
        </Suspense>
        <p className="text-sm text-muted-foreground">Patient folder</p>
      </header>

      <PatientTabs patientId={patientId} />

      {children}
    </main>
  );
}
