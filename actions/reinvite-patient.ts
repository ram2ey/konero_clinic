"use server";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reinvitePatient(patientId: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch user by ID from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientId);

    if (userError || !userData?.user?.email) {
      return {
        status: "error",
        message: "Could not find a registered email for this patient.",
      };
    }

    const email = userData.user.email;
    const fullName = userData.user.user_metadata?.full_name;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = siteUrl ? new URL("/auth/set-password", siteUrl).toString() : undefined;

    // Check if user is still unconfirmed (pending invite)
    const isConfirmed = !!userData.user.email_confirmed_at;

    if (!isConfirmed) {
      // User has not completed initial invite setup — send fresh invite
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : undefined,
        redirectTo,
      });

      if (inviteError) {
        // Fallback to reset password link if invite throws (e.g. rate limit or already initiated)
        const { error: resetError } = await admin.supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          return {
            status: "error",
            message: logAndSanitize(
              "reinvitePatient.resetFallback",
              resetError,
              "Failed to send invite email. Please try again.",
            ),
          };
        }
      }
    } else {
      // User is confirmed but needs a new setup/access link
      const { error: resetError } = await admin.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        return {
          status: "error",
          message: logAndSanitize(
            "reinvitePatient.resetPasswordForEmail",
            resetError,
            "Failed to send access link. Please try again.",
          ),
        };
      }
    }

    return {
      status: "success",
      message: `A fresh portal access invite has been sent to ${email}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("reinvitePatient", error, "Failed to send invite. Please try again."),
    };
  }
}
