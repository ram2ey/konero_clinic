import { notFound } from "next/navigation";

import { PatientTabs } from "@/components/admin/patient-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function PatientFolderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = await params;

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

  const patientName = patient.full_name ?? "Unnamed patient";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{patientName}</h1>
        <p className="text-sm text-muted-foreground">Patient folder</p>
      </header>

      <PatientTabs patientId={patientId} />

      {children}
    </main>
  );
}
