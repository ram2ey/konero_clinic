"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// App-level lockout on top of whatever platform-level rate limiting
// Supabase Auth applies itself — this is patient mental-health data, so
// unlimited password guesses against one account shouldn't be possible
// even if the platform default were ever loosened.
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Redirects to /admin unconditionally on success rather than branching on
 * role here — middleware already owns that decision (it bounces a
 * non-admin session straight to /portal), so this avoids a second,
 * potentially-drifting copy of the same routing rule.
 */
export async function signIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  // Service-role client, not the caller's session client: there is no
  // session yet at sign-in time, so there's no "own row" an RLS policy
  // could scope this to. See supabase/migrations for the corresponding
  // revoke-all-from-anon on this table — the service role is the only
  // thing that can touch it, by design, not by RLS carve-out.
  const supabaseAdmin = createAdminClient();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("sign_in_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("succeeded", false)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return { status: "error", message: "Too many failed attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Record the attempt and drop this email's rows outside the window in
  // the same round-trip — self-pruning, no separate cleanup job needed.
  // Best-effort: a logging failure here must never block sign-in itself.
  try {
    await supabaseAdmin.from("sign_in_attempts").insert({ email, succeeded: !error });
    await supabaseAdmin.from("sign_in_attempts").delete().eq("email", email).lt("created_at", windowStart);
  } catch {
    // Ignored — see comment above.
  }

  if (error) {
    // Deliberately generic — doesn't reveal whether the email exists.
    return { status: "error", message: "Invalid email or password." };
  }

  redirect("/admin");
}
