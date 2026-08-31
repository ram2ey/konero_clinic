"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { createDownloadToken } from "@/lib/storage";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const getLabDownloadUrlSchema = z.object({
  filePath: z.string().min(1).max(1024),
  patientId: z.string().uuid("Invalid patient id."),
});

export type GetLabDownloadUrlInput = z.input<typeof getLabDownloadUrlSchema>;

type DownloadUrlResult = ActionState & { url?: string };

/**
 * Returns a short-lived URL for a lab document. Two layers enforce
 * "doctor or the owning patient":
 *  1. requireDoctorOrPatient() below.
 *  2. The lab_reports lookup is scoped to `patient_id` — a caller asking
 *     about another patient's row gets zero rows, so this can't be used to
 *     probe which paths exist.
 * The returned URL carries a 60-second HMAC token; the /api/lab-file route
 * re-checks the session and the lab_reports row before streaming the file.
 */
export async function getLabDownloadUrl(
  input: GetLabDownloadUrlInput,
): Promise<DownloadUrlResult> {
  try {
    const parsed = getLabDownloadUrlSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Invalid request.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { filePath, patientId } = parsed.data;

    const access = await requireDoctorOrPatient(patientId);
    if (!access.authorized) {
      return { status: "error", message: access.message };
    }

    const { rows } = await query<{ file_path: string }>(
      `select file_path from public.lab_reports where patient_id = $1 and file_path = $2`,
      [patientId, filePath],
    );

    if (!rows[0]) {
      return { status: "error", message: "File not found." };
    }

    const token = createDownloadToken(filePath, patientId);
    return { status: "success", url: `/api/lab-file?token=${encodeURIComponent(token)}` };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("getLabDownloadUrl", error, "Something went wrong. Please try again."),
    };
  }
}
