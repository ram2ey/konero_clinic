"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const RECORD_STATUSES = ["active", "resolved", "cancelled"] as const;
const VISIT_TYPES = ["first_visit", "review"] as const;

// Sanity bounds, not medical-grade validation — catches garbage input
// (typos, unit mistakes), not clinically implausible-but-real values.
// Optional as a whole: not every consultation needs vitals taken.
const vitalsSchema = z
  .object({
    bloodPressureSystolic: z.coerce.number().int().min(40).max(300),
    bloodPressureDiastolic: z.coerce.number().int().min(20).max(200),
    heartRate: z.coerce.number().int().min(20).max(250),
    temperatureCelsius: z.coerce.number().min(25).max(45),
    respiratoryRate: z.coerce.number().int().min(5).max(60),
    weightKg: z.coerce.number().min(0.5).max(500),
    oxygenSaturation: z.coerce.number().min(0).max(100),
  })
  .partial()
  .optional();

function longText(max: number) {
  return z.string().trim().max(max).optional();
}

// Each system is free text, per the clinic's actual template — no
// further structure imposed than what was asked for.
const physicalExamSchema = z
  .object({
    general: longText(2000),
    anthropometric: longText(2000),
    cardiovascular: longText(2000),
    respiratory: longText(2000),
    gastrointestinal: longText(2000),
    cns: longText(2000),
    musculoskeletal: longText(2000),
    skin: longText(2000),
    other: longText(2000),
  })
  .optional();

const thoughtSchema = z
  .object({
    streamFlow: longText(1000),
    form: longText(1000),
    content: longText(1000),
    possession: longText(1000),
    control: longText(1000),
  })
  .optional();

const cognitionSchema = z
  .object({
    orientation: longText(1000),
    memory: longText(1000),
    attention: longText(1000),
    concentration: longText(1000),
    abstraction: longText(1000),
    generalFundOfKnowledge: longText(1000),
    judgement: longText(1000),
  })
  .optional();

// The clinic's Mental State Examination template. Each item (and
// sub-item) is free text, same approach as history/physicalExam above.
const mseSchema = z
  .object({
    appearance: longText(2000),
    behaviour: longText(2000),
    mood: longText(2000),
    affect: longText(2000),
    perception: longText(2000),
    speech: longText(2000),
    thought: thoughtSchema,
    cognition: cognitionSchema,
    insight: longText(2000),
  })
  .optional();

// A test ordered at this consultation. `testName` is the label shown
// everywhere; `labTestId` is supplementary and set only when the test was
// picked from the lab_tests catalogue rather than typed — same
// relationship diagnoses have with their ICD-11 code.
const labOrderSchema = z.object({
  testName: z.string().trim().min(2).max(200),
  labTestId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

const assessmentSchema = z
  .object({
    mse: mseSchema,
    physicalExam: physicalExamSchema,
    summary: longText(5000),
    phenomenology: longText(5000),
    managementPlan: longText(5000),
    // Free-text investigations notes. Kept alongside the structured
    // labOrders list below rather than replaced by it: every consultation
    // recorded before lab ordering existed stores its investigations
    // here, and there is still plenty worth writing that isn't a test.
    investigations: longText(5000),
    labOrders: z.array(labOrderSchema).max(30).default([]),
    riskAssessment: longText(5000),
    prognosis: longText(5000),
  })
  .optional();

const diagnosisSchema = z.object({
  condition: z.string().trim().min(2).max(300),
  status: z.enum(RECORD_STATUSES).default("active"),
  // Populated when the diagnosis was picked from the WHO ICD-11 search
  // rather than typed as plain text — see actions/search-icd11.ts.
  icd11Code: z.string().trim().max(20).optional(),
  icd11Uri: z.string().trim().max(300).optional(),
});

const prescriptionSchema = z.object({
  medicationName: z.string().trim().min(2).max(200),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(1000).optional(),
  status: z.enum(RECORD_STATUSES).default("active"),
  // Populated when the medication was picked from the local catalogue
  // rather than typed as plain text — see actions/search-medications.ts.
  medicationId: z.string().uuid().optional(),
});

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

const historySchema = z
  .object({
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
  })
  .optional();

const invoiceSchema = z.object({
  amount: z.coerce.number().positive("Invoice amount must be greater than 0.").max(10_000_000),
  description: z.string().trim().max(500).optional(),
});

const recordConsultationSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  visitType: z.enum(VISIT_TYPES),
  vitals: vitalsSchema,
  history: historySchema,
  assessment: assessmentSchema,
  diagnoses: z.array(diagnosisSchema).max(20).default([]),
  prescriptions: z.array(prescriptionSchema).max(20).default([]),
  invoice: invoiceSchema.optional(),
});

// The pre-validation shape callers build up client-side (numbers may
// still be strings from form inputs — z.coerce.number() below handles
// that at the boundary).
export type RecordConsultationInput = z.input<typeof recordConsultationSchema>;

type RecordConsultationResult = ActionState & { consultationId?: string };

/**
 * Admin-only: records a consultation — vitals, the clinic's clerking
 * assessment (MSE, physical exam, etc.), diagnoses, prescriptions, and an
 * optional invoice — atomically. The patient's HISTORY template is taken
 * once per patient rather than per visit, so it isn't part of this action —
 * see actions/save-patient-history.ts.
 *
 * Delegates the actual writes to the `record_consultation` Postgres
 * function (see supabase/migrations) instead of issuing sequential
 * `.insert()` calls from here: PostgREST has no cross-request transaction,
 * so several separate inserts from this Server Action could partially
 * fail (e.g. consultation + diagnoses committed, prescriptions rejected)
 * and leave inconsistent clinical data with no clean way to roll back the
 * earlier inserts from application code. A single RPC call is a single
 * Postgres transaction, so a bad row anywhere rolls the whole thing back.
 *
 * Called directly as a function (not bound to a <form action>) because
 * its input — nested diagnosis/prescription arrays and a nested
 * assessment object — doesn't map cleanly onto flat FormData; callers are
 * expected to assemble this shape from client-side form state and call
 * it programmatically.
 */
export async function recordConsultation(
  input: RecordConsultationInput,
): Promise<RecordConsultationResult> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = recordConsultationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { patientId, visitType, vitals, history, assessment, diagnoses, prescriptions, invoice } = parsed.data;

    const vitalsJson = vitals
      ? {
          blood_pressure:
            vitals.bloodPressureSystolic !== undefined || vitals.bloodPressureDiastolic !== undefined
              ? { systolic: vitals.bloodPressureSystolic ?? null, diastolic: vitals.bloodPressureDiastolic ?? null }
              : null,
          heart_rate_bpm: vitals.heartRate ?? null,
          temperature_celsius: vitals.temperatureCelsius ?? null,
          respiratory_rate: vitals.respiratoryRate ?? null,
          weight_kg: vitals.weightKg ?? null,
          oxygen_saturation_percent: vitals.oxygenSaturation ?? null,
        }
      : null;

    const assessmentJson = assessment
      ? {
          mse: assessment.mse
            ? {
                appearance: assessment.mse.appearance ?? null,
                behaviour: assessment.mse.behaviour ?? null,
                mood: assessment.mse.mood ?? null,
                affect: assessment.mse.affect ?? null,
                perception: assessment.mse.perception ?? null,
                speech: assessment.mse.speech ?? null,
                thought: assessment.mse.thought
                  ? {
                      stream_flow: assessment.mse.thought.streamFlow ?? null,
                      form: assessment.mse.thought.form ?? null,
                      content: assessment.mse.thought.content ?? null,
                      possession: assessment.mse.thought.possession ?? null,
                      control: assessment.mse.thought.control ?? null,
                    }
                  : null,
                cognition: assessment.mse.cognition
                  ? {
                      orientation: assessment.mse.cognition.orientation ?? null,
                      memory: assessment.mse.cognition.memory ?? null,
                      attention: assessment.mse.cognition.attention ?? null,
                      concentration: assessment.mse.cognition.concentration ?? null,
                      abstraction: assessment.mse.cognition.abstraction ?? null,
                      general_fund_of_knowledge: assessment.mse.cognition.generalFundOfKnowledge ?? null,
                      judgement: assessment.mse.cognition.judgement ?? null,
                    }
                  : null,
                insight: assessment.mse.insight ?? null,
              }
            : null,
          physical_exam: assessment.physicalExam
            ? {
                general: assessment.physicalExam.general ?? null,
                anthropometric: assessment.physicalExam.anthropometric ?? null,
                cardiovascular: assessment.physicalExam.cardiovascular ?? null,
                respiratory: assessment.physicalExam.respiratory ?? null,
                gastrointestinal: assessment.physicalExam.gastrointestinal ?? null,
                cns: assessment.physicalExam.cns ?? null,
                musculoskeletal: assessment.physicalExam.musculoskeletal ?? null,
                skin: assessment.physicalExam.skin ?? null,
                other: assessment.physicalExam.other ?? null,
              }
            : null,
          summary: assessment.summary ?? null,
          phenomenology: assessment.phenomenology ?? null,
          management_plan: assessment.managementPlan ?? null,
          investigations: assessment.investigations ?? null,
          lab_orders: (assessment.labOrders ?? []).map((order) => ({
            test_name: order.testName,
            lab_test_id: order.labTestId ?? null,
            note: order.note ?? null,
          })),
          risk_assessment: assessment.riskAssessment ?? null,
          prognosis: assessment.prognosis ?? null,
        }
      : null;

    const { data, error } = await admin.supabase.rpc("record_consultation", {
      p_patient_id: patientId,
      p_doctor_id: admin.userId,
      p_vitals: vitalsJson,
      p_assessment: assessmentJson,
      p_diagnoses: diagnoses.map((d) => ({
        condition: d.condition,
        status: d.status,
        icd11_code: d.icd11Code ?? null,
        icd11_uri: d.icd11Uri ?? null,
      })),
      p_prescriptions: prescriptions.map((p) => ({
        medication_name: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        instructions: p.instructions ?? null,
        status: p.status,
        medication_id: p.medicationId ?? null,
      })),
      p_invoice: invoice ? { amount: invoice.amount, description: invoice.description ?? null } : null,
      p_visit_type: visitType,
    });

    if (error) {
      // 23503: the FK on consultations.patient_id rejected a nonexistent
      // id. invalid_patient: the id exists but isn't a patient profile
      // (e.g. the admin's own id) — see record_consultation in
      // supabase/migrations.
      const message =
        error.code === "23503" || error.message?.includes("invalid_patient")
          ? "Patient not found."
          : logAndSanitize(
              "recordConsultation",
              error,
              "Failed to record the consultation. Please try again.",
            );

      return { status: "error", message };
    }

    // If history data was provided, persist to patient_history
    if (history) {
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

      try {
        await admin.supabase.from("patient_history").upsert({
          patient_id: patientId,
          history: historyJson,
          updated_at: new Date().toISOString(),
          updated_by: admin.userId,
        });
      } catch (historyErr) {
        console.error("Failed to upsert patient_history during recordConsultation:", historyErr);
      }
    }

    revalidatePath(`/admin/consultations/${patientId}`);

    return {
      status: "success",
      message: "Consultation recorded.",
      consultationId: data ?? undefined,
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("recordConsultation", error, "Something went wrong. Please try again."),
    };
  }
}
