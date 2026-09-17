import {
  ConsultationDetail,
} from "@/components/admin/consultation-detail-view";
import { PreviousConsultationsList } from "@/components/admin/previous-consultations-list";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { query } from "@/lib/db";

// The PostgREST embed (`diagnoses (...)`, `prescriptions (...)`) is
// replaced with correlated json_agg subqueries so the row shape handed to
// the presentational list is identical to before.
const CONSULTATIONS_SQL = `
  select
    c.id, c.created_at, c.vitals, c.assessment, c.visit_type,
    coalesce(
      (select json_agg(json_build_object(
         'id', d.id, 'condition', d.condition, 'status', d.status,
         'icd11_code', d.icd11_code, 'icd11_uri', d.icd11_uri) order by d.created_at)
       from public.diagnoses d where d.consultation_id = c.id),
      '[]'::json
    ) as diagnoses,
    coalesce(
      (select json_agg(json_build_object(
         'id', p.id, 'medication_name', p.medication_name, 'dosage', p.dosage,
         'frequency', p.frequency, 'instructions', p.instructions, 'status', p.status,
         'medication_id', p.medication_id) order by p.created_at)
       from public.prescriptions p where p.consultation_id = c.id),
      '[]'::json
    ) as prescriptions
  from public.consultations c
  where c.patient_id = $1
  order by c.created_at desc
`;

export async function PreviousConsultations({ patientId }: { patientId: string }) {
  const [consultationsRes, patientRes] = await Promise.all([
    query<ConsultationDetail>(CONSULTATIONS_SQL, [patientId]),
    query<{ full_name: string | null }>(
      `select full_name from public.profiles where id = $1`,
      [patientId],
    ),
  ]);

  const items = consultationsRes.rows;
  const patientName = patientRes.rows[0]?.full_name;

  return <PreviousConsultationsList items={items} patientId={patientId} patientName={patientName} />;
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
