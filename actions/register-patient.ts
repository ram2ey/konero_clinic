"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const SEXES = ["male", "female", "intersex"] as const;
const GENDER_IDENTITIES = ["male", "female", "other", "prefer_not_to_say"] as const;
const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "separated", "other"] as const;
const INFORMANT_RELIABILITIES = ["reliable", "partially_reliable", "unreliable"] as const;

function isPastDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getTime() > Date.now()) return false;
  return date.getUTCFullYear() >= 1900;
}

// FormData yields "" for a blank text input and null for a missing key —
// both mean "not provided" for an optional field, not "explicitly empty".
function optionalText(max: number) {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(max).optional(),
  );
}

function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.enum(values).optional(),
  );
}

const registerPatientSchema = z.object({
  // Core identity — required to send an invite at all.
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
  sex: z.enum(SEXES, { message: "Select a sex." }),

  // Everything below is intake detail that often isn't known until the
  // actual assessment — optional at registration, fillable later.
  genderIdentity: optionalEnum(GENDER_IDENTITIES),
  maritalStatus: optionalEnum(MARITAL_STATUSES),
  occupation: optionalText(200),
  educationLevel: optionalText(200),
  religion: optionalText(200),
  ethnicity: optionalText(200),
  nationality: optionalText(200),
  residence: optionalText(500),
  nextOfKinName: optionalText(200),
  nextOfKinRelationship: optionalText(200),
  nextOfKinContact: optionalText(200),
  informantName: optionalText(200),
  informantRelationship: optionalText(200),
  informantReliability: optionalEnum(INFORMANT_RELIABILITIES),
  referralSource: optionalText(200),
  referralReason: optionalText(1000),
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

    const parsed = registerPatientSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { fullName, email, phone, dob, ...rest } = parsed.data;

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
      sex: rest.sex,
      gender_identity: rest.genderIdentity,
      marital_status: rest.maritalStatus,
      occupation: rest.occupation,
      education_level: rest.educationLevel,
      religion: rest.religion,
      ethnicity: rest.ethnicity,
      nationality: rest.nationality,
      residence: rest.residence,
      next_of_kin_name: rest.nextOfKinName,
      next_of_kin_relationship: rest.nextOfKinRelationship,
      next_of_kin_contact: rest.nextOfKinContact,
      informant_name: rest.informantName,
      informant_relationship: rest.informantRelationship,
      informant_reliability: rest.informantReliability,
      referral_source: rest.referralSource,
      referral_reason: rest.referralReason,
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

    revalidatePath("/admin/consultations");

    return { status: "success", message: `Invite sent to ${email}.` };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("registerPatient", error, "Something went wrong. Please try again."),
    };
  }
}
