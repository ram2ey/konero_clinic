import { IdCard } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { formatMedicalId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
        {patient.full_name ?? "Unnamed patient"}
      </h1>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
        <IdCard className="size-3.5" />
        {formatMedicalId(patientId)}
      </span>
    </div>
  );
}

function PatientHeadingSkeleton() {
  return <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />;
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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div>
        <Suspense fallback={<PatientHeadingSkeleton />}>
          <PatientHeading patientId={patientId} />
        </Suspense>
      </div>

      {children}
    </main>
  );
}
