"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const SIGNED_URL_TTL_SECONDS = 60;

const getLabDownloadUrlSchema = z.object({
  filePath: z.string().min(1).max(1024),
  patientId: z.string().uuid("Invalid patient id."),
});

export type GetLabDownloadUrlInput = z.input<typeof getLabDownloadUrlSchema>;

type DownloadUrlResult = ActionState & { url?: string };

/**
 * Issues a short-lived signed URL for a lab document.
 *
 * Two independent layers enforce "doctor or the owning patient":
 *  1. requireDoctorOrPatient() below, for a clean error message.
 *  2. The lab_reports lookup and createSignedUrl call both run on the
 *     caller's own session client (never the admin client), so RLS on
 *     lab_reports and on storage.objects is still checked for real. Even
 *     if (1) had a bug, a patient's session can never sign a path outside
 *     their own storage folder — the storage RLS policy itself rejects
 *     it. This function is a convenience, not the security boundary.
 *
 * The lab_reports lookup also matters on its own: it confirms this is a
 * real, recorded report for this patient rather than just a
 * plausible-looking path, before ever asking Storage to sign it. Because
 * that query runs through the same RLS, a patient asking about another
 * patient's row simply gets zero rows back — not an error, just "not
 * found" — so this can't be used to probe which paths exist.
 */
export async function getLabDownloadUrl(input: GetLabDownloadUrlInput): Promise<DownloadUrlResult> {
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

    const { data: report, error: lookupError } = await access.supabase
      .from("lab_reports")
      .select("file_path")
      .eq("patient_id", patientId)
      .eq("file_path", filePath)
      .maybeSingle();

    if (lookupError) {
      return {
        status: "error",
        message: logAndSanitize(
          "getLabDownloadUrl.lookup",
          lookupError,
          "Failed to load the document. Please try again.",
        ),
      };
    }

    if (!report) {
      return { status: "error", message: "File not found." };
    }

    const { data: signed, error: signError } = await access.supabase.storage
      .from("lab-documents")
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS, { download: true });

    if (signError || !signed) {
      return {
        status: "error",
        message: logAndSanitize(
          "getLabDownloadUrl.createSignedUrl",
          signError ?? new Error("createSignedUrl returned no data"),
          "Failed to generate a download link. Please try again.",
        ),
      };
    }

    return { status: "success", url: signed.signedUrl };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("getLabDownloadUrl", error, "Something went wrong. Please try again."),
    };
  }
}
