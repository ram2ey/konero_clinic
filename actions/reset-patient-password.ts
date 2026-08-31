"use server";

import type { ActionState } from "@/lib/action-state";
import { hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { generateTempPassword } from "@/lib/temp-password";

type ResetPatientPasswordResult = ActionState & { tempPassword?: string; email?: string };

/**
 * Admin-only: issues a new temporary password for a patient and forces
 * them to change it at their next sign-in.
 *
 * This is now the sole account-recovery path — there is no reset email.
 * When someone has lost their password and is standing at the desk, the
 * front desk hands them a fresh temporary credential.
 */
export async function resetPatientPassword(
  patientId: string,
): Promise<ResetPatientPasswordResult> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const { rows } = await query<{ email: string }>(
      `select email from public.users where id = $1`,
      [patientId],
    );
    const email = rows[0]?.email;
    if (!email) {
      return {
        status: "error",
        message: "Could not find a registered email for this patient.",
      };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await query(
      `update public.users
          set password_hash = $1, must_change_password = true
        where id = $2`,
      [passwordHash, patientId],
    );

    return {
      status: "success",
      message: `New temporary password issued for ${email}.`,
      tempPassword,
      email,
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize(
        "resetPatientPassword",
        error,
        "Failed to reset the patient's password. Please try again.",
      ),
    };
  }
}
