import { EMPTY_HISTORY, PatientHistoryForm, type HistoryState } from "@/components/admin/patient-history-form";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

type PatientHistoryRow = {
  presenting_complaints?: string | null;
  history_of_presenting_complaints?: string | null;
  on_direct_question?: string | null;
  systemic_enquiry?: Record<string, string | null> | null;
  past_psychiatric_history?: string | null;
  past_medical_history?: Record<string, string | null> | null;
  past_surgical_history?: string | null;
  treatment_history?: Record<string, string | null> | null;
  family_history?: Record<string, string | null> | null;
  personal_history?: Record<string, string | null> | null;
  substance_use_addiction_history?: string | null;
  premorbid_personality?: string | null;
} | null;

function toHistoryState(row: PatientHistoryRow): HistoryState {
  if (!row) return EMPTY_HISTORY;

  return {
    presentingComplaints: row.presenting_complaints ?? "",
    historyOfPresentingComplaints: row.history_of_presenting_complaints ?? "",
    onDirectQuestion: row.on_direct_question ?? "",
    systemicEnquiry: {
      general: row.systemic_enquiry?.general ?? "",
      respiratory: row.systemic_enquiry?.respiratory ?? "",
      cardiovascular: row.systemic_enquiry?.cardiovascular ?? "",
      abdominal: row.systemic_enquiry?.abdominal ?? "",
      genitourinary: row.systemic_enquiry?.genitourinary ?? "",
      centralNervous: row.systemic_enquiry?.central_nervous ?? "",
    },
    pastPsychiatricHistory: row.past_psychiatric_history ?? "",
    pastMedicalHistory: {
      seizureDisorder: row.past_medical_history?.seizure_disorder ?? "",
      sickleCellDisease: row.past_medical_history?.sickle_cell_disease ?? "",
      asthma: row.past_medical_history?.asthma ?? "",
      hypertension: row.past_medical_history?.hypertension ?? "",
      diabetes: row.past_medical_history?.diabetes ?? "",
      tuberculosis: row.past_medical_history?.tuberculosis ?? "",
      headInjury: row.past_medical_history?.head_injury ?? "",
      roadTrafficAccident: row.past_medical_history?.road_traffic_accident ?? "",
      other: row.past_medical_history?.other ?? "",
    },
    pastSurgicalHistory: row.past_surgical_history ?? "",
    treatmentHistory: {
      orthodoxMedications: row.treatment_history?.orthodox_medications ?? "",
      herbalMedications: row.treatment_history?.herbal_medications ?? "",
      allergies: row.treatment_history?.allergies ?? "",
      churchPrayerCamps: row.treatment_history?.church_prayer_camps ?? "",
      other: row.treatment_history?.other ?? "",
    },
    familyHistory: {
      father: row.family_history?.father ?? "",
      mother: row.family_history?.mother ?? "",
      siblings: row.family_history?.siblings ?? "",
      seizureDisorder: row.family_history?.seizure_disorder ?? "",
      mentalIllness: row.family_history?.mental_illness ?? "",
      suicide: row.family_history?.suicide ?? "",
      addiction: row.family_history?.addiction ?? "",
      hypertension: row.family_history?.hypertension ?? "",
      diabetes: row.family_history?.diabetes ?? "",
      asthma: row.family_history?.asthma ?? "",
      sickleCellDisease: row.family_history?.sickle_cell_disease ?? "",
    },
    personalHistory: {
      pregnancyAndBirth: row.personal_history?.pregnancy_and_birth ?? "",
      earlyChildhoodAndDevelopment: row.personal_history?.early_childhood_and_development ?? "",
      education: row.personal_history?.education ?? "",
      occupation: row.personal_history?.occupation ?? "",
      psychosexualRelationship: row.personal_history?.psychosexual_relationship ?? "",
      maritalHistory: row.personal_history?.marital_history ?? "",
      socialHistory: row.personal_history?.social_history ?? "",
      forensicHistory: row.personal_history?.forensic_history ?? "",
    },
    substanceUseAddictionHistory: row.substance_use_addiction_history ?? "",
    premorbidPersonality: row.premorbid_personality ?? "",
  };
}

export async function PatientHistorySection({ patientId }: { patientId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_history")
    .select("history, updated_at")
    .eq("patient_id", patientId)
    .maybeSingle<{ history: PatientHistoryRow; updated_at: string }>();

  return (
    <PatientHistoryForm
      patientId={patientId}
      initialHistory={toHistoryState(data?.history ?? null)}
      initialUpdatedAt={data?.updated_at ?? null}
    />
  );
}

export function PatientHistorySectionSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
