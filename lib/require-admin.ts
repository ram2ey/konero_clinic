import "server-only";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RequireAdminResult =
  | { authorized: true; supabase: SupabaseServerClient; userId: string }
  | { authorized: false; message: string };

/**
 * Confirms the invoking request comes from a signed-in doctor_admin.
 *
 * This is a UX / defense-in-depth check, not the only line of defense —
 * every clinical table's RLS policies already reject non-admin writes at
 * the database layer (see supabase/migrations). Calling this first just
 * lets a Server Action fail fast with a clean, sanitized message instead
 * of surfacing a raw Postgres/RLS error to the client.
 *
 * Uses the `is_admin()` RPC rather than re-deriving the check here, so
 * there is exactly one definition of "is this user an admin" for the
 * whole app (see supabase/migrations for why it's safe from recursion).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || !isAdmin) {
    return { authorized: false, message: "You do not have permission to do that." };
  }

  return { authorized: true, supabase, userId: user.id };
}
