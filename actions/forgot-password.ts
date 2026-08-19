"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

/**
 * Sends a password-reset email via Supabase Auth. Always returns the
 * same success message regardless of whether the email is actually
 * registered — same reasoning as sign-in's generic error message: don't
 * let this become a way to enumerate which emails have accounts.
 *
 * This is the escape hatch for the sign-in lockout in actions/sign-in.ts
 * too: resetPasswordForEmail doesn't touch sign_in_attempts at all, so
 * it works as an immediate way back in even while that lockout is
 * active — waiting out the 15-minute window is never the only option
 * for someone who genuinely doesn't remember their password.
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

  try {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // Reuses the same page that finishes the invite flow — Supabase
    // encodes a session in the URL fragment the same way for both a
    // recovery link and an invite link, and that page already knows how
    // to pick it up and call updateUser({ password }).
    const redirectTo = siteUrl ? new URL("/auth/set-password", siteUrl).toString() : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

    // Logged server-side either way (cheap, and useful if it turns out
    // to be a real infra failure) — but the client-facing message stays
    // generic regardless, same as Supabase's own recover endpoint never
    // distinguishing "no such email" from "email sent".
    if (error) {
      logAndSanitize("forgotPassword", error, GENERIC_MESSAGE);
    }

    return { status: "success", message: GENERIC_MESSAGE };
  } catch (error) {
    logAndSanitize("forgotPassword", error, GENERIC_MESSAGE);
    return { status: "success", message: GENERIC_MESSAGE };
  }
}
