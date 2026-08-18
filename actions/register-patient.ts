"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;

function isPastDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getTime() > Date.now()) return false;
  return date.getUTCFullYear() >= 1900;
}

const registerPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the patient's full name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-.\s]{7,20}$/, "Enter a valid phone number."),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format.")
    .refine(isPastDate, "Enter a valid date of birth."),
  gender: z.enum(GENDERS, { message: "Select a gender." }),
});

/**
 * Admin-only: onboards a new patient.
 *
 * Two systems are involved (Supabase Auth, which owns identity, and
 * Postgres, which owns the profile row) and there is no way to wrap an
 * Auth Admin API call and a SQL insert in one transaction — they're
 * different services. So this does the invite first (it's the source of
 * truth for "does this user exist"), and if the follow-up profile insert
 * fails, it compensates by deleting the just-created auth user rather
 * than leaving an orphaned account with no profile that can never
 * successfully be re-invited (inviteUserByEmail would then say the email
 * is already registered).
 */
export async function registerPatient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = registerPatientSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      dob: formData.get("dob"),
      gender: formData.get("gender"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { fullName, email, phone, dob, gender } = parsed.data;

    const supabaseAdmin = createAdminClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // Requires an /auth/set-password route that calls
    // supabase.auth.updateUser({ password }) once the invite link lands —
    // inviteUserByEmail signs the user in via the link but leaves the
    // password unset.
    const redirectTo = siteUrl ? new URL("/auth/set-password", siteUrl).toString() : undefined;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName },
        redirectTo,
      },
    );

    if (inviteError) {
      // `code` is the stable identifier; the message check is a fallback
      // for older/self-hosted GoTrue versions that don't set it.
      const alreadyRegistered =
        inviteError.code === "email_exists" ||
        inviteError.message.toLowerCase().includes("already been registered") ||
        inviteError.message.toLowerCase().includes("already registered");

      return {
        status: "error",
        message: alreadyRegistered
          ? "A patient with this email is already registered."
          : logAndSanitize(
              "registerPatient.inviteUserByEmail",
              inviteError,
              "Failed to send the patient invite. Please try again.",
            ),
      };
    }

    const newUser = inviteData.user;
    if (!newUser) {
      return {
        status: "error",
        message: logAndSanitize(
          "registerPatient.inviteUserByEmail",
          new Error("inviteUserByEmail returned no user"),
          "Failed to send the patient invite. Please try again.",
        ),
      };
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: newUser.id,
      role: "patient",
      full_name: fullName,
      phone,
      dob,
      gender,
    });

    if (profileError) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      } catch (cleanupError) {
        // The invited auth user is now orphaned (no profile row, and the
        // email can't be re-invited until this is cleaned up manually).
        // Surfacing this loudly matters more than usual here.
        console.error(
          "[registerPatient] cleanup failed after profile insert error — orphaned auth user",
          newUser.id,
          cleanupError,
        );
      }

      const message =
        profileError.code === "23505"
          ? "A profile for this patient already exists."
          : logAndSanitize(
              "registerPatient.profileInsert",
              profileError,
              "Failed to create the patient profile. Please try again.",
            );

      return { status: "error", message };
    }

    revalidatePath("/admin/patients");

    return { status: "success", message: `Invite sent to ${email}.` };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("registerPatient", error, "Something went wrong. Please try again."),
    };
  }
}
