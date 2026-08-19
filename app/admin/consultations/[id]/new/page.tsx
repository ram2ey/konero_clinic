import { RecordConsultationForm, type VisitType } from "@/components/admin/record-consultation-form";
import { createClient } from "@/lib/supabase/server";

export default async function RecordConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  // Just a default the clinician can override, not a source of truth —
  // see the migration for why visit_type is stored explicitly rather
  // than derived from "is this the patient's earliest consultation row".
  const { count } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId);

  const suggestedVisitType: VisitType = count && count > 0 ? "review" : "first_visit";

  return <RecordConsultationForm patientId={patientId} suggestedVisitType={suggestedVisitType} />;
}
