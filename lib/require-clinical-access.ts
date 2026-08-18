import "server-only";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ClinicalAccessResult =
  | { authorized: true; supabase: SupabaseServerClient; userId: string; isAdmin: boolean }
  | { authorized: false; message: string };

/**
 * Confirms the invoking user is either the doctor_admin or the patient
 * identified by `patientId` — the shared rule behind lab report uploads
 * and signed download URLs.
 *
 * As with requireAdmin(), this is UX / defense-in-depth, not the only
 * boundary: the DB calls made with the returned `supabase` client still
 * run as the caller's own session, so RLS on `lab_reports` and
 * `storage.objects` enforces the identical "admin or owning patient" rule
 * regardless of what this function decides.
 */
export async function requireDoctorOrPatient(patientId: string): Promise<ClinicalAccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }

  if (user.id === patientId) {
    return { authorized: true, supabase, userId: user.id, isAdmin: false };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || !isAdmin) {
    return { authorized: false, message: "You do not have permission to do that." };
  }

  return { authorized: true, supabase, userId: user.id, isAdmin: true };
}
