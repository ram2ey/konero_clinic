import {
  ConsultationDetail,
} from "@/components/admin/consultation-detail-view";
import { PreviousConsultationsList } from "@/components/admin/previous-consultations-list";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

export async function PreviousConsultations({ patientId }: { patientId: string }) {
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
      .returns<ConsultationDetail[]>(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", patientId)
      .single<{ full_name: string | null }>(),
  ]);

  const items = consultationsRes.data ?? [];
  const patientName = patientRes.data?.full_name;

  return <PreviousConsultationsList items={items} patientName={patientName} />;
}

export function PreviousConsultationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="gap-0 p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-full" />
        </Card>
      ))}
    </div>
  );
}
