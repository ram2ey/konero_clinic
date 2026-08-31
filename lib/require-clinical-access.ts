import "server-only";

import { getSessionUser } from "@/lib/auth/session";

type ClinicalAccessResult =
  | { authorized: true; userId: string; isAdmin: boolean }
  | { authorized: false; message: string };

/**
 * Confirms the caller is either the doctor_admin or the patient named by
 * `patientId` — the rule behind lab-report uploads and downloads.
 *
 * As with `requireAdmin`, this is now a real boundary (no RLS behind it):
 * callers must still scope their SQL to `patientId` / the returned
 * `userId`, but this is what decides whether the caller may touch this
 * patient's records at all.
 */
export async function requireDoctorOrPatient(
  patientId: string,
): Promise<ClinicalAccessResult> {
  const user = await getSessionUser();

  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }
  if (user.id === patientId) {
    return { authorized: true, userId: user.id, isAdmin: false };
  }
  if (user.role === "doctor_admin") {
    return { authorized: true, userId: user.id, isAdmin: true };
  }

  return { authorized: false, message: "You do not have permission to do that." };
}
