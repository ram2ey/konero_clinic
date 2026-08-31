"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { deleteLabFile } from "@/lib/storage";
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

    try {
      await query(
        `insert into public.lab_reports (patient_id, uploaded_by, test_name, file_path, notes)
         values ($1, $2, $3, $4, $5)`,
        [patientId, access.userId, testName, filePath, notes ?? null],
      );
    } catch (err) {
      const message =
        (err as { code?: string }).code === "23514"
          ? "This file does not belong to that patient."
          : logAndSanitize("recordLabReport", err, "Failed to save the lab report. Please try again.");

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

/**
 * Deletes an uploaded lab file that never got a metadata row — the client
 * uploader calls this when recordLabReport fails, so Storage and Postgres
 * don't drift (the same compensating-action shape as before, minus the
 * direct Storage client).
 */
export async function deleteOrphanLabFile(
  patientId: string,
  filePath: string,
): Promise<void> {
  const access = await requireDoctorOrPatient(patientId);
  if (!access.authorized) return;
  if (!filePath.startsWith(`${patientId}/`)) return;
  await deleteLabFile(filePath);
}
