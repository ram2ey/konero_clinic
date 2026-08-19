"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const recordLabReportSchema = z
  .object({
    patientId: z.string().uuid("Invalid patient id."),
    filePath: z.string().min(1).max(1024),
    testName: z.string().trim().min(2, "Enter a test name.").max(200),
    notes: z.string().trim().max(2000).optional(),
  })
  // Defense-in-depth ahead of the DB: lab_reports also has a CHECK
  // constraint requiring file_path to start with patient_id/ (see
  // supabase/migrations). Catching the mismatch here gives a clean field
  // error instead of a raw check_violation.
  .refine((v) => v.filePath.startsWith(`${v.patientId}/`), {
    message: "File path does not belong to this patient.",
    path: ["filePath"],
  });

export type RecordLabReportInput = z.input<typeof recordLabReportSchema>;

/**
 * Records lab_reports metadata for a file already uploaded client-side
 * directly to Storage (see components/LabUploader.tsx).
 *
 * Storage and Postgres are separate systems with no shared transaction —
 * a failure here leaves an uploaded-but-unrecorded object. The uploader
 * component compensates by deleting it on a non-success result here,
 * mirroring the same two-system pattern actions/register-patient.ts uses
 * for its Auth + Postgres split.
 */
export async function recordLabReport(input: RecordLabReportInput): Promise<ActionState> {
  try {
    const parsed = recordLabReportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { patientId, filePath, testName, notes } = parsed.data;

    const access = await requireDoctorOrPatient(patientId);
    if (!access.authorized) {
      return { status: "error", message: access.message };
    }

    const { error } = await access.supabase.from("lab_reports").insert({
      patient_id: patientId,
      uploaded_by: access.userId,
      test_name: testName,
      file_path: filePath,
      notes: notes ?? null,
    });

    if (error) {
      const message =
        error.code === "23514"
          ? "This file does not belong to that patient."
          : logAndSanitize("recordLabReport", error, "Failed to save the lab report. Please try again.");

      return { status: "error", message };
    }

    revalidatePath(`/admin/consultations/${patientId}`);
    revalidatePath("/portal");

    return { status: "success", message: "Lab report saved." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("recordLabReport", error, "Something went wrong. Please try again."),
    };
  }
}
