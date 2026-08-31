import { mapDbHistoryToState } from "@/lib/patient-history";
import { RecordConsultationForm, type VisitType } from "@/components/admin/record-consultation-form";
import { query } from "@/lib/db";

export default async function RecordConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  let count = 0;
  let historyData: unknown = null;

  try {
    const [consultationRes, historyRes] = await Promise.all([
      query<{ n: string }>(
        `select count(*)::text as n from public.consultations where patient_id = $1`,
        [patientId],
      ),
      query<{ history: unknown }>(
        `select history from public.patient_history where patient_id = $1`,
        [patientId],
      ),
    ]);

    count = Number(consultationRes.rows[0]?.n ?? 0);
    historyData = historyRes.rows[0]?.history ?? null;
  } catch (error) {
    console.error("[RecordConsultationPage] Error pre-fetching history or consultation count:", error);
  }

  const suggestedVisitType: VisitType = count > 0 ? "review" : "first_visit";
  const initialHistory = historyData ? mapDbHistoryToState(historyData) : undefined;

  return (
    <RecordConsultationForm
      patientId={patientId}
      suggestedVisitType={suggestedVisitType}
      initialHistory={initialHistory}
    />
  );
}
