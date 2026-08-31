import { IdCard } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { query } from "@/lib/db";
import { formatMedicalId } from "@/lib/format";

async function PatientHeading({ patientId }: { patientId: string }) {
  const { rows } = await query<{ full_name: string | null }>(
    `select full_name from public.profiles where id = $1 and role = 'patient'`,
    [patientId],
  );
  const patient = rows[0];

  if (!patient) {
    notFound();
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {patient.full_name ?? "Unnamed patient"}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
          <IdCard className="size-3.5" />
          {formatMedicalId(patientId)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ResetPasswordButton
          patientId={patientId}
          patientName={patient.full_name}
          variant="outline"
          size="sm"
        />
      </div>
    </div>
  );
}

function PatientHeadingSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
    </div>
  );
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
