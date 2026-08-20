"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";

export type ApproveRequestResult = ActionState<{
  patientId: string;
  fullName: string;
  email: string;
  tempPassword: string;
}>;

export async function approveAndOnboardRequest(
  requestId: string
): Promise<ApproveRequestResult> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    // 1. Fetch the request details
    const { data: request, error: fetchError } = await admin.supabase
      .from("consultation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return {
        status: "error",
        message: "Consultation request not found or has been removed.",
      };
    }

    if (request.status === "approved" && request.converted_patient_id) {
      return {
        status: "error",
        message: "This consultation request has already been approved and converted to a patient.",
      };
    }

    const fullName = request.full_name.trim();
    const email = request.email.trim().toLowerCase();
    const phone = request.phone.trim();
    const dob = request.dob;
    const sex = request.sex;

    const supabaseAdmin = createAdminClient();
    const tempPassword = generateTempPassword();

    // 2. Create Auth User
    const { data: createdData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { must_change_password: true },
      });

    if (createError) {
      const alreadyRegistered =
        createError.code === "email_exists" ||
        createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("already registered");

      return {
        status: "error",
        message: logAndSanitize(
          "approveAndOnboardRequest.createUser",
          createError,
          alreadyRegistered
            ? "A patient account with this email address already exists."
            : "Failed to create patient account."
        ),
      };
    }

    const newUser = createdData.user;
    if (!newUser) {
      return {
        status: "error",
        message: "Failed to generate patient user identity.",
      };
    }

    // 3. Create Profile
    const { error: profileError } = await admin.supabase.from("profiles").insert({
      id: newUser.id,
      role: "patient",
      full_name: fullName,
      phone,
      dob: dob || null,
      sex: sex || null,
    });

    if (profileError) {
      // Compensate: Delete created auth user so we don't leave an orphan
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      return {
        status: "error",
        message: logAndSanitize(
          "approveAndOnboardRequest.insertProfile",
          profileError,
          "Failed to create patient profile record."
        ),
      };
    }

    // 4. Update consultation_requests record
    await admin.supabase
      .from("consultation_requests")
      .update({
        status: "approved",
        converted_patient_id: newUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    revalidatePath("/admin/requests");
    revalidatePath("/admin/consultations");
    revalidatePath("/admin");

    return {
      status: "success",
      message: `Patient account for ${fullName} created successfully.`,
      data: {
        patientId: newUser.id,
        fullName,
        email,
        tempPassword,
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: logAndSanitize(
        "approveAndOnboardRequest.unexpected",
        err,
        "An unexpected error occurred while onboarding the patient."
      ),
    };
  }
}

export async function updateRequestStatus(
  requestId: string,
  status: "pending" | "contacted" | "rejected",
  adminNotes?: string
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminNotes !== undefined) {
      updates.admin_notes = adminNotes;
    }

    const { error } = await admin.supabase
      .from("consultation_requests")
      .update(updates)
      .eq("id", requestId);

    if (error) {
      return {
        status: "error",
        message: logAndSanitize(
          "updateRequestStatus",
          error,
          "Failed to update request status."
        ),
      };
    }

    revalidatePath("/admin/requests");
    revalidatePath("/admin");

    return {
      status: "success",
      message: `Status updated to ${status}.`,
    };
  } catch (err) {
    return {
      status: "error",
      message: logAndSanitize(
        "updateRequestStatus.unexpected",
        err,
        "An unexpected error occurred."
      ),
    };
  }
}
