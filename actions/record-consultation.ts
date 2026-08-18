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
  .refine((v) => v.bloodPressureDiastolic < v.bloodPressureSystolic, {
    message: "Diastolic pressure must be lower than systolic pressure.",
    path: ["bloodPressureDiastolic"],
  });

const diagnosisSchema = z.object({
  condition: z.string().trim().min(2).max(300),
  status: z.enum(RECORD_STATUSES).default("active"),
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
  clinicalNotes: z.string().trim().max(5000).optional(),
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
 * Admin-only: records a consultation plus its diagnoses, prescriptions,
 * and an optional invoice, atomically.
 *
 * Delegates the actual writes to the `record_consultation` Postgres
 * function (see supabase/migrations) instead of issuing sequential
 * `.insert()` calls from here: PostgREST has no cross-request transaction,
 * so four separate inserts from this Server Action could partially fail
 * (e.g. consultation + diagnoses committed, prescriptions rejected) and
 * leave inconsistent clinical data with no clean way to roll back the
 * earlier inserts from application code. A single RPC call is a single
 * Postgres transaction, so a bad row anywhere rolls the whole thing back.
 *
 * Called directly as a function (not bound to a <form action>) because
 * its input — nested diagnosis/prescription arrays — doesn't map cleanly
 * onto flat FormData; callers are expected to assemble this shape from
 * client-side form state and call it programmatically.
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

    const { patientId, vitals, clinicalNotes, diagnoses, prescriptions, invoice } = parsed.data;

    const vitalsJson = {
      blood_pressure: {
        systolic: vitals.bloodPressureSystolic,
        diastolic: vitals.bloodPressureDiastolic,
      },
      heart_rate_bpm: vitals.heartRate,
      temperature_celsius: vitals.temperatureCelsius,
      respiratory_rate: vitals.respiratoryRate,
      weight_kg: vitals.weightKg,
      oxygen_saturation_percent: vitals.oxygenSaturation,
    };

    const { data, error } = await admin.supabase.rpc("record_consultation", {
      p_patient_id: patientId,
      p_doctor_id: admin.userId,
      p_vitals: vitalsJson,
      p_clinical_notes: clinicalNotes ?? null,
      p_diagnoses: diagnoses.map((d) => ({ condition: d.condition, status: d.status })),
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

    revalidatePath(`/admin/patients/${patientId}`);

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
