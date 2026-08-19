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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Diagnostic Lab Reports
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {items.length} diagnostic test report{items.length === 1 ? "" : "s"} uploaded across all clinical patients.
        </p>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                <FileText className="size-6 opacity-60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-2">No lab reports uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 transition-all duration-150 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors mt-0.5">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/consultations/${item.patient_id}/bio-data`}
                        className="truncate text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors inline-block"
                      >
                        {nameById.get(item.patient_id) ?? "Unknown patient"}
                      </Link>
                      <p className="truncate text-xs sm:text-sm font-semibold text-foreground/80 mt-0.5">{item.test_name}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.notes}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                        Uploaded {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 self-start sm:self-center">
                    <LabReportDownloadButton patientId={item.patient_id} filePath={item.file_path} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
