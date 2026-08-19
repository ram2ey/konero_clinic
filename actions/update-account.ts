"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const updateAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short.").max(200),
  phone: z.string().trim().max(30).optional(),
});

export type UpdateAccountInput = z.input<typeof updateAccountSchema>;

/**
 * Admin-only: updates the signed-in doctor_admin's own name/phone.
 * `id <> auth.uid()` is never true for this call, so it's really the
 * profiles_admin_update RLS policy's self-row guard (see
 * supabase/migrations) that keeps this scoped to the caller's own row —
 * the `.eq("id", ...)` below is belt and suspenders, not the boundary.
 */
export async function updateAccount(input: UpdateAccountInput): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = updateAccountSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { fullName, phone } = parsed.data;

    const { error } = await admin.supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone ?? null })
      .eq("id", admin.userId);

    if (error) {
      return {
        status: "error",
        message: logAndSanitize("updateAccount", error, "Failed to save changes. Please try again."),
      };
    }

    revalidatePath("/admin/settings");

    return { status: "success", message: "Account updated." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("updateAccount", error, "Something went wrong. Please try again."),
    };
  }
}
