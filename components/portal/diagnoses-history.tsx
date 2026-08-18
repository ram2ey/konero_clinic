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
  created_at: string;
};

export async function DiagnosesHistory({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: diagnoses } = await supabase
    .from("diagnoses")
    .select("id, condition, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<Diagnosis[]>();

  const items = diagnoses ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnoses History</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.condition}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
                <RecordStatusBadge status={item.status} />
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
