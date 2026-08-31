"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, the clinic has been notified. For a faster reset, contact the clinic directly — the front desk can issue you a new temporary password.";
const MAX_RESET_ATTEMPTS = 3;
const WINDOW_MINUTES = 15;

/**
 * There is no automated password-reset email in this deployment. The real
 * recovery path is the admin re-issuing a temporary password at the desk
 * (actions/reset-patient-password.ts).
 *
 * This endpoint is kept so the /forgot-password page still has somewhere
 * to POST, and it still records + rate-limits requests (3 per 15 min per
 * email) so it can't be used to enumerate accounts or as a flooding
 * vector. It always returns the same generic message.
 */
export async function forgotPassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { email } = parsed.data;
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  try {
    const { rows } = await query<{ n: string }>(
      `select count(*)::text as n
         from public.password_reset_requests
        where email = $1 and created_at >= $2`,
      [email, windowStart],
    );
    if (Number(rows[0]?.n ?? 0) >= MAX_RESET_ATTEMPTS) {
      return { status: "success", message: GENERIC_MESSAGE };
    }

    await query(`insert into public.password_reset_requests (email) values ($1)`, [email]);
    await query(
      `delete from public.password_reset_requests where email = $1 and created_at < $2`,
      [email, windowStart],
    );
  } catch {
    // If the bookkeeping table is unavailable, still return the generic
    // message rather than surfacing an error.
  }

  return { status: "success", message: GENERIC_MESSAGE };
}
