"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";
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

// Exported so the registration page can widen useActionState's state
// type — it infers from `initialActionState`, which is a bare ActionState
// and would otherwise hide tempPassword. Type-only export, erased at
// build time, so it doesn't violate the "use server" value-export rule.
export type RegisterPatientResult = ActionState & { tempPassword?: string; email?: string };

/**
 * Admin-only: onboards a new patient.
 *
 * Two systems are involved (Supabase Auth, which owns identity, and
 * Postgres, which owns the profile row) and there is no way to wrap an
 * Auth Admin API call and a SQL insert in one transaction — they're
 * different services. So this creates the auth user first (it's the
 * source of truth for "does this user exist"), and if the follow-up
 * profile insert fails, it compensates by deleting the just-created auth
 * user rather than leaving an orphaned account with no profile that can
 * never successfully be registered again (createUser would then say the
 * email is already registered).
 *
 * Onboarding used to go through inviteUserByEmail, which mailed a magic
 * link to /auth/set-password. It now creates the account directly with a
 * generated temporary password, handed to the admin once to pass on to
 * the patient. That removes any dependency on email delivery to get a
 * patient into the portal at all.
 *
 * Two flags make that work:
 *  - `email_confirm: true` — without it the account exists but every
 *    sign-in fails with "Email not confirmed", and nothing in the UI
 *    could resolve it.
 *  - `app_metadata.must_change_password` — forces a password change at
 *    first sign-in (enforced in middleware.ts). It lives in app_metadata,
 *    not user_metadata and not on profiles, because both of those are
 *    writable by the patient themselves (see profiles_patient_update in
 *    supabase/migrations) and could simply be cleared. app_metadata is
 *    service-role only, and it already rides along on the getUser() call
 *    middleware makes on every request, so enforcing it costs no extra
 *    query.
 */
export async function registerPatient(
  _prevState: ActionState,
  formData: FormData,
): Promise<RegisterPatientResult> {
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

    const tempPassword = generateTempPassword();

    const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { must_change_password: true },
    });

    if (createError) {
      // `code` is the stable identifier; the message check is a fallback
      // for older/self-hosted GoTrue versions that don't set it.
      const alreadyRegistered =
        createError.code === "email_exists" ||
        createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("already registered");

      // Supabase enforces its own password policy (minimum length, and
      // optionally character classes) on the admin API too, so a project
      // configured above this generator's output would fail here rather
      // than at the patient's first sign-in.
      const weakPassword =
        createError.code === "weak_password" ||
        createError.message.toLowerCase().includes("password");

      return {
        status: "error",
        message: alreadyRegistered
          ? "A patient with this email is already registered."
          : weakPassword
            ? logAndSanitize(
                "registerPatient.createUser",
                createError,
                "The generated temporary password did not meet this project's password policy. Lower the requirement in Supabase Auth settings, or lengthen generateTempPassword().",
              )
            : logAndSanitize(
                "registerPatient.createUser",
                createError,
                "Failed to register the patient. Please try again.",
              ),
      };
    }

    const newUser = createdData.user;
    if (!newUser) {
      return {
        status: "error",
        message: logAndSanitize(
          "registerPatient.createUser",
          new Error("createUser returned no user"),
          "Failed to register the patient. Please try again.",
        ),
      };
    }

    // Session client, not supabaseAdmin — profiles_admin_insert (`with
    // check (public.is_admin())`) already permits this for the caller
    // requireAdmin() just verified, and routing it through RLS here
    // keeps that policy a real second checkpoint instead of only ever
    // being exercised by requests that skip requireAdmin() entirely.
    const { error: profileError } = await admin.supabase.from("profiles").insert({
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

    // The password is returned exactly once and never stored anywhere. If
    // the admin loses it before handing it over, the fix is to issue a new
    // one from the patient's folder (see actions/reset-patient-password.ts).
    return {
      status: "success",
      message: `${fullName} can now sign in.`,
      tempPassword,
      email,
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("registerPatient", error, "Something went wrong. Please try again."),
    };
  }
}
