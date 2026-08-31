"use server";

import { randomUUID } from "crypto";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const SEXES = ["male", "female", "intersex"] as const;
const CONSULTATION_MODES = ["in_person", "virtual", "flexible"] as const;

function isPastDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getTime() > Date.now()) return false;
  return date.getUTCFullYear() >= 1900;
}

const submitRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(200, "Name cannot exceed 200 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9()\-.\s]{7,25}$/,
      "Please enter a valid phone or WhatsApp number (at least 7 digits)."
    ),
  dob: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || (val.match(/^\d{4}-\d{2}-\d{2}$/) && isPastDate(val)), {
      message: "Please enter a valid date of birth (YYYY-MM-DD).",
    }),
  sex: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.enum(SEXES).optional()
  ),
  preferredMode: z.preprocess(
    (val) => (val === "" || val === null ? "flexible" : val),
    z.enum(CONSULTATION_MODES).default("flexible")
  ),
  preferredTime: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(300).optional()
  ),
  reason: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(2000, "Reason cannot exceed 2000 characters.").optional()
  ),
});

export type SubmitConsultationRequestResult = ActionState<{
  requestId: string;
  fullName: string;
}>;

export async function submitConsultationRequest(
  _prevState: ActionState,
  formData: FormData
): Promise<SubmitConsultationRequestResult> {
  try {
    const rawData = Object.fromEntries(formData);
    const parsed = submitRequestSchema.safeParse(rawData);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please review the form and correct the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const {
      fullName,
      email,
      phone,
      dob,
      sex,
      preferredMode,
      preferredTime,
      reason,
    } = parsed.data;

    // The id is generated here (rather than read back via RETURNING) — the
    // public form never needs the row back, only a confirmation.
    const requestId = randomUUID();

    try {
      await query(
        `insert into public.consultation_requests
           (id, full_name, email, phone, dob, sex, preferred_mode, preferred_time, reason, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [
          requestId,
          fullName,
          email,
          phone,
          dob || null,
          sex || null,
          preferredMode,
          preferredTime || null,
          reason || null,
        ],
      );
    } catch (insertError) {
      return {
        status: "error",
        message: logAndSanitize(
          "submitConsultationRequest",
          insertError,
          "Unable to submit your request at this time. Please try again or reach out directly."
        ),
      };
    }

    return {
      status: "success",
      message: "Your consultation request has been received.",
      data: {
        requestId,
        fullName,
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: logAndSanitize(
        "submitConsultationRequest.unexpected",
        err,
        "An unexpected error occurred. Please try again."
      ),
    };
  }
}
