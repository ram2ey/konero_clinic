import { Pill } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";

import { RecordStatusBadge } from "./status-badge";

type Prescription = {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  status: "active" | "resolved" | "cancelled";
  created_at: string;
};

export async function MedicationsList({ patientId }: { patientId: string }) {
  const { rows: items } = await query<Prescription>(
    `select id, medication_name, dosage, frequency, instructions, status, created_at
       from public.prescriptions
      where patient_id = $1 and status = 'active'
      order by created_at desc`,
    [patientId],
  );

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pill className="size-4" />
            </div>
            <CardTitle className="text-lg font-bold">Active Medications</CardTitle>
          </div>
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {items.length} Active
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-200 hover:border-primary/30 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {item.medication_name}
                    </p>
                    <RecordStatusBadge status={item.status} />
                  </div>
                  
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {item.dosage && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                        {item.dosage}
                      </span>
                    )}
                    {item.frequency && (
                      <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {item.frequency}
                      </span>
                    )}
                  </div>

                  {item.instructions && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground mr-1">Instructions:</span>
                      {item.instructions}
                    </div>
                  )}
                </div>

                <p className="mt-3.5 text-[11px] font-medium text-muted-foreground">
                  Prescribed on {formatDate(item.created_at)}
                </p>
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
      <Pill className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No active medications right now.</p>
    </div>
  );
}

export function MedicationsListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Medications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-3" />}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
