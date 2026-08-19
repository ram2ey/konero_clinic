"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";
const MAX_RESET_ATTEMPTS = 3;
const WINDOW_MINUTES = 15;

/**
 * Sends a password-reset email via Supabase Auth. Always returns the
 * same success message regardless of whether the email is actually
 * registered — same reasoning as sign-in's generic error message: don't
 * let this become a way to enumerate which emails have accounts.
 *
 * Includes application-level rate limiting (max 3 requests per 15 minutes)
 * to prevent automated email flooding / denial of service.
 */
export async function forgotPassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { email } = parsed.data;

  // Rate limiting check via service-role client (best effort)
  try {
    const supabaseAdmin = createAdminClient();
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_RESET_ATTEMPTS) {
      // Silently return generic message without triggering additional emails
      return { status: "success", message: GENERIC_MESSAGE };
    }

    await supabaseAdmin.from("password_reset_requests").insert({ email });
    await supabaseAdmin.from("password_reset_requests").delete().eq("email", email).lt("created_at", windowStart);
  } catch {
    // If rate-limiting table is unavailable, continue gracefully
  }

  try {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // Reuses the same page that finishes the invite flow — Supabase
    // encodes a session in the URL fragment the same way for both a
    // recovery link and an invite link, and that page already knows how
    // to pick it up and call updateUser({ password }).
    const redirectTo = siteUrl ? new URL("/auth/set-password", siteUrl).toString() : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      logAndSanitize("forgotPassword", error, GENERIC_MESSAGE);
    }

    return { status: "success", message: GENERIC_MESSAGE };
  } catch (error) {
    logAndSanitize("forgotPassword", error, GENERIC_MESSAGE);
    return { status: "success", message: GENERIC_MESSAGE };
  }
}

