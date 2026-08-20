"use server";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";

type ResetPatientPasswordResult = ActionState & { tempPassword?: string; email?: string };

/**
 * Admin-only: issues a new temporary password for a patient and forces
 * them to change it at their next sign-in.
 *
 * Replaces the old reinvitePatient action, which mailed an invite or a
 * recovery link. Onboarding no longer depends on email at all (see
 * actions/register-patient.ts), so the "patient can't get in" fix is the
 * same operation as the original registration: hand them a fresh
 * temporary credential.
 *
 * Patients who can still receive email retain the self-service route at
 * /forgot-password — this is for the desk, when someone has lost their
 * password and is standing in front of you.
 */
export async function resetPatientPassword(patientId: string): Promise<ResetPatientPasswordResult> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const supabaseAdmin = createAdminClient();

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientId);

    if (userError || !userData?.user?.email) {
      return {
        status: "error",
        message: "Could not find a registered email for this patient.",
      };
    }

    const email = userData.user.email;
    const tempPassword = generateTempPassword();

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(patientId, {
      password: tempPassword,
      // Also confirm the email: accounts created under the old invite flow
      // may never have been confirmed, and an unconfirmed account rejects
      // password sign-in no matter how correct the password is.
      email_confirm: true,
      app_metadata: { ...userData.user.app_metadata, must_change_password: true },
    });

    if (updateError) {
      return {
        status: "error",
        message: logAndSanitize(
          "resetPatientPassword",
          updateError,
          "Failed to reset the patient's password. Please try again.",
        ),
      };
    }

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
