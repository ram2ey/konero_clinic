import { FileText } from "lucide-react";
import Link from "next/link";

import { LabReportDownloadButton } from "@/components/portal/lab-report-download-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type LabReportRow = {
  id: string;
  patient_id: string;
  test_name: string;
  file_path: string;
  notes: string | null;
  created_at: string;
};

export default async function LabReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("lab_reports")
    .select("id, patient_id, test_name, file_path, notes, created_at")
    .order("created_at", { ascending: false })
    .returns<LabReportRow[]>();

  const items = reports ?? [];

  const patientIds = Array.from(new Set(items.map((r) => r.patient_id)));
  const { data: patients } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name ?? "Unnamed patient"]));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lab Reports</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} report{items.length === 1 ? "" : "s"} across all patients, most recent first.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No lab reports uploaded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/consultations/${item.patient_id}/bio-data`}
                        className="truncate font-medium text-foreground hover:underline"
                      >
                        {nameById.get(item.patient_id) ?? "Unknown patient"}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">{item.test_name}</p>
                      {item.notes && <p className="truncate text-xs text-muted-foreground">{item.notes}</p>}
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <LabReportDownloadButton patientId={item.patient_id} filePath={item.file_path} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
