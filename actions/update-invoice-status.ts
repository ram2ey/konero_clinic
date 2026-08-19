"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID."),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
});

export type UpdateInvoiceStatusInput = z.input<typeof updateInvoiceStatusSchema>;

/**
 * Admin-only: Updates an invoice's status (e.g. marking a pending invoice as paid).
 */
export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = updateInvoiceStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { invoiceId, status } = parsed.data;

    const { error } = await admin.supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId);

    if (error) {
      return {
        status: "error",
        message: logAndSanitize("updateInvoiceStatus", error, "Failed to update invoice status. Please try again."),
      };
    }

    revalidatePath("/admin/billing");
    revalidatePath("/admin");
    revalidatePath("/portal");

    const statusLabel = {
      paid: "marked as Paid",
      pending: "set to Pending",
      overdue: "marked as Overdue",
      cancelled: "Cancelled",
    }[status];

    return { status: "success", message: `Invoice successfully ${statusLabel}.` };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("updateInvoiceStatus", error, "Something went wrong. Please try again."),
    };
  }
}
