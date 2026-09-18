"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
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
type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export async function updateInvoiceStatus(
  input: UpdateInvoiceStatusInput,
): Promise<ActionState<{ status: InvoiceStatus; amountPaid: number }>> {
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

    const { rows } = await query<{ patient_id: string; status: InvoiceStatus; amount_paid: number }>(
      `update public.invoices
          set status = $1,
              amount_paid = case
                when $1 = 'paid' then amount
                when $1 in ('pending', 'overdue') and amount_paid >= amount then 0
                else amount_paid
              end
        where id = $2
        returning patient_id, status, amount_paid::float8 as amount_paid`,
      [status, invoiceId],
    );

    const invoice = rows[0];
    if (!invoice) return { status: "error", message: "Invoice not found." };

    revalidatePath("/admin/billing");
    revalidatePath(`/admin/consultations/${invoice.patient_id}`);
    revalidatePath("/admin");
    revalidatePath("/portal");

    const statusLabel = {
      paid: "marked as Paid",
      pending: "set to Pending",
      overdue: "marked as Overdue",
      cancelled: "Cancelled",
    }[status];

    return {
      status: "success",
      message: `Invoice successfully ${statusLabel}.`,
      data: { status: invoice.status, amountPaid: invoice.amount_paid },
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("updateInvoiceStatus", error, "Something went wrong. Please try again."),
    };
  }
}
