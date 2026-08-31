"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { hashPassword } from "@/lib/auth/password";
import { query, withTransaction } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { generateTempPassword } from "@/lib/temp-password";

export type ApproveRequestResult = ActionState<{
  patientId: string;
  fullName: string;
  email: string;
  tempPassword: string;
}>;

type RequestRow = {
  status: string;
  converted_patient_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  dob: string | null;
  sex: string | null;
};

export async function approveAndOnboardRequest(
  requestId: string,
): Promise<ApproveRequestResult> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const { rows } = await query<RequestRow>(
      `select status, converted_patient_id, full_name, email, phone, dob, sex
         from public.consultation_requests
        where id = $1`,
      [requestId],
    );
    const request = rows[0];

    if (!request) {
      return {
        status: "error",
        message: "Consultation request not found or has been removed.",
      };
    }
    if (request.status === "approved" && request.converted_patient_id) {
      return {
        status: "error",
        message:
          "This consultation request has already been approved and converted to a patient.",
      };
    }

    const fullName = request.full_name.trim();
    const email = request.email.trim().toLowerCase();
    const phone = request.phone.trim();
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    let patientId: string;
    try {
      patientId = await withTransaction(async (client) => {
        const created = await client.query<{ id: string }>(
          `insert into public.users (email, password_hash, must_change_password)
           values ($1, $2, true)
           returning id`,
          [email, passwordHash],
        );
        const userId = created.rows[0].id;

        await client.query(
          `insert into public.profiles (id, role, full_name, phone, dob, sex)
           values ($1, 'patient', $2, $3, $4, $5)`,
          [userId, fullName, phone, request.dob || null, request.sex || null],
        );

        await client.query(
          `update public.consultation_requests
              set status = 'approved', converted_patient_id = $1, updated_at = now()
            where id = $2`,
          [userId, requestId],
        );

        return userId;
      });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        return {
          status: "error",
          message: "A patient account with this email address already exists.",
        };
      }
      throw err;
    }

    revalidatePath("/admin/requests");
    revalidatePath("/admin/consultations");
    revalidatePath("/admin");

    return {
      status: "success",
      message: `Patient account for ${fullName} created successfully.`,
      data: { patientId, fullName, email, tempPassword },
    };
  } catch (err) {
    return {
      status: "error",
      message: logAndSanitize(
        "approveAndOnboardRequest.unexpected",
        err,
        "An unexpected error occurred while onboarding the patient.",
      ),
    };
  }
}

export async function updateRequestStatus(
  requestId: string,
  status: "pending" | "contacted" | "rejected",
  adminNotes?: string,
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    if (adminNotes !== undefined) {
      await query(
        `update public.consultation_requests
            set status = $1, admin_notes = $2, updated_at = now()
          where id = $3`,
        [status, adminNotes, requestId],
      );
    } else {
      await query(
        `update public.consultation_requests
            set status = $1, updated_at = now()
          where id = $2`,
        [status, requestId],
      );
    }

    revalidatePath("/admin/requests");
    revalidatePath("/admin");

    return { status: "success", message: `Status updated to ${status}.` };
  } catch (err) {
    return {
      status: "error",
      message: logAndSanitize(
        "updateRequestStatus.unexpected",
        err,
        "An unexpected error occurred.",
      ),
    };
  }
}
