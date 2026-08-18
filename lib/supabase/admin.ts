import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. This key bypasses RLS entirely — it can
 * read and write every row in every table, ignoring `is_admin()` and every
 * policy in the schema migration. It must never reach the browser.
 *
 * Two independent guards enforce that:
 *  1. The `server-only` import above makes Next.js fail the build if this
 *     module is ever imported, even transitively, from a Client Component.
 *  2. `SUPABASE_SERVICE_ROLE_KEY` is deliberately NOT prefixed with
 *     `NEXT_PUBLIC_`, so Next.js never inlines it into a client bundle in
 *     the first place — the build-time guard above is defense in depth on
 *     top of that, not the only thing standing between this key and the
 *     browser.
 *
 * Scope of use: admin-only, backend-triggered operations that cannot go
 * through a user's own RLS-scoped session — e.g. inviting a new patient
 * via `auth.admin.inviteUserByEmail`, or provisioning the single
 * `doctor_admin` account during setup. Do not use this client to read or
 * write clinical data on a user's behalf; use `lib/supabase/server.ts` for
 * anything performed in the context of a signed-in user, so RLS still
 * applies.
 *
 * Never imported at module scope elsewhere and cached — each admin
 * operation is rare (onboarding/invites), so a fresh short-lived client
 * per call is simpler than managing a long-lived privileged singleton.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
