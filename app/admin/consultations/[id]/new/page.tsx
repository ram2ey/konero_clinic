import { mapDbHistoryToState } from "@/components/admin/patient-history-form";
import { RecordConsultationForm, type VisitType } from "@/components/admin/record-consultation-form";
import { createClient } from "@/lib/supabase/server";

export default async function RecordConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  // Load prior consultation count for suggested visit type and existing history record
  const [{ count }, { data: historyRow }] = await Promise.all([
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId),
    supabase
      .from("patient_history")
      .select("history")
      .eq("patient_id", patientId)
      .maybeSingle(),
  ]);

  const suggestedVisitType: VisitType = count && count > 0 ? "review" : "first_visit";
  const initialHistory = historyRow?.history ? mapDbHistoryToState(historyRow.history) : undefined;

  return (
    <RecordConsultationForm
      patientId={patientId}
      suggestedVisitType={suggestedVisitType}
      initialHistory={initialHistory}
    />
  );
}
