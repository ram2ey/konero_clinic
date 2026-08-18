import { Pill } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("id, medication_name, dosage, frequency, instructions, status, created_at")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<Prescription[]>();

  const items = prescriptions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Medications</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.medication_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[item.dosage, item.frequency].filter(Boolean).join(" · ") || "No dosage on file"}
                    </p>
                    {item.instructions && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.instructions}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prescribed {formatDate(item.created_at)}
                    </p>
                  </div>
                  <RecordStatusBadge status={item.status} />
                </div>
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
