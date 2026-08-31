import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";

import { LabReportDownloadButton } from "./lab-report-download-button";
import { UploadLabDrawer } from "./upload-lab-drawer";

type LabReport = {
  id: string;
  test_name: string;
  file_path: string;
  notes: string | null;
  created_at: string;
};

export async function LabReportsSection({
  patientId,
  showUpload = true,
}: {
  patientId: string;
  showUpload?: boolean;
}) {
  const { rows: items } = await query<LabReport>(
    `select id, test_name, file_path, notes, created_at
       from public.lab_reports
      where patient_id = $1
      order by created_at desc`,
    [patientId],
  );

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <CardTitle className="text-lg font-bold">Diagnostic Lab Reports</CardTitle>
        </div>
        {showUpload && <UploadLabDrawer patientId={patientId} />}
      </CardHeader>
      <CardContent className="pt-5">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-200 hover:border-primary/30 hover:shadow-xs"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors mt-0.5">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                      {item.test_name}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Uploaded on {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  <LabReportDownloadButton patientId={patientId} filePath={item.file_path} />
                </div>
              </div>
            ))}
          </div>
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
