import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { LabReportDownloadButton } from "./lab-report-download-button";
import { UploadLabDrawer } from "./upload-lab-drawer";

type LabReport = {
  id: string;
  test_name: string;
  file_path: string;
  notes: string | null;
  created_at: string;
};

export async function LabReportsSection({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: labReports } = await supabase
    .from("lab_reports")
    .select("id, test_name, file_path, notes, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<LabReport[]>();

  const items = labReports ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Lab Reports</CardTitle>
        <UploadLabDrawer patientId={patientId} />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.test_name}</p>
                    {item.notes && <p className="truncate text-sm text-muted-foreground">{item.notes}</p>}
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <LabReportDownloadButton patientId={patientId} filePath={item.file_path} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <FileText className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No lab reports uploaded yet.</p>
    </div>
  );
}

export function LabReportsSectionSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Lab Reports</CardTitle>
        <Skeleton className="h-8 w-40 rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-3" />}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 size-4 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
