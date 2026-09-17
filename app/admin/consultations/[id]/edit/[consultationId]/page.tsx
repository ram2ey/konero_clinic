import { notFound } from "next/navigation";

import type { ConsultationDetail } from "@/components/admin/consultation-detail-view";
import { RecordConsultationForm } from "@/components/admin/record-consultation-form";
import { query } from "@/lib/db";
import { mapDbHistoryToState } from "@/lib/patient-history";

export default async function EditConsultationPage({
  params,
}: {
  params: Promise<{ id: string; consultationId: string }>;
}) {
  const { id: patientId, consultationId } = await params;
  const [consultationResult, historyResult] = await Promise.all([
    query<ConsultationDetail>(
      `select
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
       where c.id = $1 and c.patient_id = $2`,
      [consultationId, patientId],
    ),
    query<{ history: unknown }>(
      `select history from public.patient_history where patient_id = $1`,
      [patientId],
    ),
  ]);

  const consultation = consultationResult.rows[0];
  if (!consultation) notFound();

  const history = historyResult.rows[0]?.history;
  return (
    <RecordConsultationForm
      patientId={patientId}
      suggestedVisitType={consultation.visit_type}
      initialHistory={history ? mapDbHistoryToState(history) : undefined}
      initialConsultation={consultation}
    />
  );
}
