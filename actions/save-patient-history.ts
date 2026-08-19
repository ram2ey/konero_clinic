"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

function longText(max: number) {
  return z.string().trim().max(max).optional();
}

const systemicEnquirySchema = z
  .object({
    general: longText(1000),
    respiratory: longText(1000),
    cardiovascular: longText(1000),
    abdominal: longText(1000),
    genitourinary: longText(1000),
    centralNervous: longText(1000),
  })
  .optional();

const pastMedicalHistorySchema = z
  .object({
    seizureDisorder: longText(1000),
    sickleCellDisease: longText(1000),
    asthma: longText(1000),
    hypertension: longText(1000),
    diabetes: longText(1000),
    tuberculosis: longText(1000),
    headInjury: longText(1000),
    roadTrafficAccident: longText(1000),
    other: longText(1000),
  })
  .optional();

const treatmentHistorySchema = z
  .object({
    orthodoxMedications: longText(1000),
    herbalMedications: longText(1000),
    allergies: longText(1000),
    churchPrayerCamps: longText(1000),
    other: longText(1000),
  })
  .optional();

const familyHistorySchema = z
  .object({
    father: longText(1000),
    mother: longText(1000),
    siblings: longText(1000),
    seizureDisorder: longText(1000),
    mentalIllness: longText(1000),
    suicide: longText(1000),
    addiction: longText(1000),
    hypertension: longText(1000),
    diabetes: longText(1000),
    asthma: longText(1000),
    sickleCellDisease: longText(1000),
  })
  .optional();

const personalHistorySchema = z
  .object({
    pregnancyAndBirth: longText(1000),
    earlyChildhoodAndDevelopment: longText(1000),
    education: longText(1000),
    occupation: longText(1000),
    psychosexualRelationship: longText(1000),
    maritalHistory: longText(1000),
    socialHistory: longText(1000),
    forensicHistory: longText(1000),
  })
  .optional();

// The clinic's full psychiatric clerking "HISTORY" template. Each item
// (and sub-item) is free text — no more structure imposed than the
// template itself calls for. Taken once per patient (see patient_history
// in supabase/migrations), not once per visit.
const historySchema = z.object({
  presentingComplaints: longText(3000),
  historyOfPresentingComplaints: longText(5000),
  onDirectQuestion: longText(3000),
  systemicEnquiry: systemicEnquirySchema,
  pastPsychiatricHistory: longText(3000),
  pastMedicalHistory: pastMedicalHistorySchema,
  pastSurgicalHistory: longText(2000),
  treatmentHistory: treatmentHistorySchema,
  familyHistory: familyHistorySchema,
  personalHistory: personalHistorySchema,
  substanceUseAddictionHistory: longText(3000),
  premorbidPersonality: longText(2000),
});

const savePatientHistorySchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  history: historySchema,
});

export type SavePatientHistoryInput = z.input<typeof savePatientHistorySchema>;

/**
 * Admin-only: creates or updates the patient's HISTORY record (see
 * patient_history in supabase/migrations). Unlike recordConsultation this
 * is a single-table upsert, not an RPC — there's no multi-table atomicity
 * concern here, so a plain `.upsert()` is enough.
 */
export async function savePatientHistory(input: SavePatientHistoryInput): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = savePatientHistorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { patientId, history } = parsed.data;

    const historyJson = {
      presenting_complaints: history.presentingComplaints ?? null,
      history_of_presenting_complaints: history.historyOfPresentingComplaints ?? null,
      on_direct_question: history.onDirectQuestion ?? null,
      systemic_enquiry: history.systemicEnquiry
        ? {
            general: history.systemicEnquiry.general ?? null,
            respiratory: history.systemicEnquiry.respiratory ?? null,
            cardiovascular: history.systemicEnquiry.cardiovascular ?? null,
            abdominal: history.systemicEnquiry.abdominal ?? null,
            genitourinary: history.systemicEnquiry.genitourinary ?? null,
            central_nervous: history.systemicEnquiry.centralNervous ?? null,
          }
        : null,
      past_psychiatric_history: history.pastPsychiatricHistory ?? null,
      past_medical_history: history.pastMedicalHistory
        ? {
            seizure_disorder: history.pastMedicalHistory.seizureDisorder ?? null,
            sickle_cell_disease: history.pastMedicalHistory.sickleCellDisease ?? null,
            asthma: history.pastMedicalHistory.asthma ?? null,
            hypertension: history.pastMedicalHistory.hypertension ?? null,
            diabetes: history.pastMedicalHistory.diabetes ?? null,
            tuberculosis: history.pastMedicalHistory.tuberculosis ?? null,
            head_injury: history.pastMedicalHistory.headInjury ?? null,
            road_traffic_accident: history.pastMedicalHistory.roadTrafficAccident ?? null,
            other: history.pastMedicalHistory.other ?? null,
          }
        : null,
      past_surgical_history: history.pastSurgicalHistory ?? null,
      treatment_history: history.treatmentHistory
        ? {
            orthodox_medications: history.treatmentHistory.orthodoxMedications ?? null,
            herbal_medications: history.treatmentHistory.herbalMedications ?? null,
            allergies: history.treatmentHistory.allergies ?? null,
            church_prayer_camps: history.treatmentHistory.churchPrayerCamps ?? null,
            other: history.treatmentHistory.other ?? null,
          }
        : null,
      family_history: history.familyHistory
        ? {
            father: history.familyHistory.father ?? null,
            mother: history.familyHistory.mother ?? null,
            siblings: history.familyHistory.siblings ?? null,
            seizure_disorder: history.familyHistory.seizureDisorder ?? null,
            mental_illness: history.familyHistory.mentalIllness ?? null,
            suicide: history.familyHistory.suicide ?? null,
            addiction: history.familyHistory.addiction ?? null,
            hypertension: history.familyHistory.hypertension ?? null,
            diabetes: history.familyHistory.diabetes ?? null,
            asthma: history.familyHistory.asthma ?? null,
            sickle_cell_disease: history.familyHistory.sickleCellDisease ?? null,
          }
        : null,
      personal_history: history.personalHistory
        ? {
            pregnancy_and_birth: history.personalHistory.pregnancyAndBirth ?? null,
            early_childhood_and_development: history.personalHistory.earlyChildhoodAndDevelopment ?? null,
            education: history.personalHistory.education ?? null,
            occupation: history.personalHistory.occupation ?? null,
            psychosexual_relationship: history.personalHistory.psychosexualRelationship ?? null,
            marital_history: history.personalHistory.maritalHistory ?? null,
            social_history: history.personalHistory.socialHistory ?? null,
            forensic_history: history.personalHistory.forensicHistory ?? null,
          }
        : null,
      substance_use_addiction_history: history.substanceUseAddictionHistory ?? null,
      premorbid_personality: history.premorbidPersonality ?? null,
    };

    const { error } = await admin.supabase.from("patient_history").upsert({
      patient_id: patientId,
      history: historyJson,
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    });

    if (error) {
      const message =
        error.code === "23503"
          ? "Patient not found."
          : logAndSanitize("savePatientHistory", error, "Failed to save history. Please try again.");

      return { status: "error", message };
    }

    revalidatePath(`/admin/consultations/${patientId}/history`);

    return { status: "success", message: "History saved." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("savePatientHistory", error, "Something went wrong. Please try again."),
    };
  }
}
