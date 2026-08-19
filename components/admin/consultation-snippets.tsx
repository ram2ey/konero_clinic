import { ArrowRight, ClipboardList, Stethoscope } from "lucide-react";
import Link from "next/link";

import {
  ConsultationDetail,
} from "@/components/admin/consultation-detail-view";
import { ConsultationSnippetCard } from "@/components/admin/consultation-snippet-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

export async function ConsultationSnippets({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const [consultationsRes, patientRes] = await Promise.all([
    supabase
      .from("consultations")
      .select(`
        id,
        created_at,
        vitals,
        assessment,
        visit_type,
        diagnoses (id, condition, status, icd11_code, icd11_uri),
        prescriptions (id, medication_name, dosage, frequency, instructions, status)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ConsultationDetail[]>(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", patientId)
      .single<{ full_name: string | null }>(),
  ]);

  const items = consultationsRes.data ?? [];
  const patientName = patientRes.data?.full_name;

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Stethoscope className="size-4" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Previous Consultations</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recent clinical visits and assessments
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Link href={`/admin/consultations/${patientId}?tab=consultation`} scroll={false}>
              <span>View all ({items.length})</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
              <ClipboardList className="size-5 opacity-60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1">No consultations recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ConsultationSnippetCard
                key={item.id}
                item={item}
                patientId={patientId}
                patientName={patientName}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ConsultationSnippetsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Previous Consultations</CardTitle>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/80 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
