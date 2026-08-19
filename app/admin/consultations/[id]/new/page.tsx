import { mapDbHistoryToState } from "@/lib/patient-history";
import { RecordConsultationForm, type VisitType } from "@/components/admin/record-consultation-form";
import { createClient } from "@/lib/supabase/server";

export default async function RecordConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  let count = 0;
  let historyData: unknown = null;

  try {
    const [consultationRes, historyRes] = await Promise.all([
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

    count = consultationRes.count ?? 0;
    historyData = historyRes.data?.history;
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
