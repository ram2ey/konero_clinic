import { Stethoscope } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { RecordStatusBadge } from "./status-badge";

type Diagnosis = {
  id: string;
  condition: string;
  status: "active" | "resolved" | "cancelled";
  icd11_code: string | null;
  created_at: string;
};

export async function DiagnosesHistory({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: diagnoses } = await supabase
    .from("diagnoses")
    .select("id, condition, status, icd11_code, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<Diagnosis[]>();

  const items = diagnoses ?? [];

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="size-4" />
            </div>
            <CardTitle className="text-lg font-bold">Diagnoses History</CardTitle>
          </div>
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {items.length} Recorded
            </span>
          )}
        </div>
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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                      {item.condition}
                    </p>
                    {item.icd11_code && (
                      <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        ICD-11: {item.icd11_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recorded on {formatDate(item.created_at)}
                  </p>
                </div>
                <div className="flex items-center self-start sm:self-center">
                  <RecordStatusBadge status={item.status} />
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
      <Stethoscope className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No diagnoses recorded yet.</p>
    </div>
  );
}

export function DiagnosesHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnoses History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-3" />}
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
