"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { hashPassword } from "@/lib/auth/password";
import { withTransaction } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
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
  // Core identity — required to create an account at all.
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
// type. Type-only export, erased at build time, so it doesn't violate the
// "use server" value-export rule.
export type RegisterPatientResult = ActionState & { tempPassword?: string; email?: string };

/**
 * Admin-only: onboards a new patient. Creates the `users` row (with a
 * generated temporary password and `must_change_password = true`) and the
 * `profiles` row in a single transaction, so a failure on either leaves
 * nothing behind — no compensating delete needed.
 *
 * The temp password is returned to the admin exactly once and never
 * stored. If it's lost before hand-off, issue a new one from the
 * patient's folder (actions/reset-patient-password.ts).
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
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      await withTransaction(async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `insert into public.users (email, password_hash, must_change_password)
           values ($1, $2, true)
           returning id`,
          [email, passwordHash],
        );
        const userId = rows[0].id;

        await client.query(
          `insert into public.profiles (
             id, role, full_name, phone, dob, sex, gender_identity, marital_status,
             occupation, education_level, religion, ethnicity, nationality, residence,
             next_of_kin_name, next_of_kin_relationship, next_of_kin_contact,
             informant_name, informant_relationship, informant_reliability,
             referral_source, referral_reason
           ) values (
             $1, 'patient', $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12, $13,
             $14, $15, $16,
             $17, $18, $19,
             $20, $21
           )`,
          [
            userId,
            fullName,
            phone,
            dob,
            rest.sex,
            rest.genderIdentity ?? null,
            rest.maritalStatus ?? null,
            rest.occupation ?? null,
            rest.educationLevel ?? null,
            rest.religion ?? null,
            rest.ethnicity ?? null,
            rest.nationality ?? null,
            rest.residence ?? null,
            rest.nextOfKinName ?? null,
            rest.nextOfKinRelationship ?? null,
            rest.nextOfKinContact ?? null,
            rest.informantName ?? null,
            rest.informantRelationship ?? null,
            rest.informantReliability ?? null,
            rest.referralSource ?? null,
            rest.referralReason ?? null,
          ],
        );
      });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        return { status: "error", message: "A patient with this email is already registered." };
      }
      throw err;
    }

    revalidatePath("/admin/consultations");

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
