"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const RECORD_STATUSES = ["active", "resolved", "cancelled"] as const;

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

const assessmentSchema = z
  .object({
    mse: mseSchema,
    physicalExam: physicalExamSchema,
    summary: longText(5000),
    phenomenology: longText(5000),
    managementPlan: longText(5000),
    investigations: longText(5000),
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
});

const invoiceSchema = z.object({
  amount: z.coerce.number().min(0).max(1_000_000),
  description: z.string().trim().max(500).optional(),
});

const recordConsultationSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  vitals: vitalsSchema,
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

    const { patientId, vitals, assessment, diagnoses, prescriptions, invoice } = parsed.data;

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
      })),
      p_invoice: invoice ? { amount: invoice.amount, description: invoice.description ?? null } : null,
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
