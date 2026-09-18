"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const updateInvoicePaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID."),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative.").max(10_000_000),
});

type PaymentResult = {
  amountPaid: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
};

export async function updateInvoicePayment(
  input: z.input<typeof updateInvoicePaymentSchema>,
): Promise<ActionState<PaymentResult>> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) return { status: "error", message: admin.message };

    const parsed = updateInvoicePaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { rows } = await query<{
      patient_id: string;
      amount_paid: number;
      status: PaymentResult["status"];
    }>(
      `update public.invoices
          set amount_paid = $1,
              status = case
                when $1 = amount then 'paid'::public.invoice_status
                when status = 'paid' then 'pending'::public.invoice_status
                else status
              end
        where id = $2 and $1 <= amount
        returning patient_id, amount_paid::float8 as amount_paid, status`,
      [parsed.data.amountPaid, parsed.data.invoiceId],
    );

    const invoice = rows[0];
    if (!invoice) {
      return { status: "error", message: "Invoice not found, or amount paid exceeds the invoice total." };
    }

    revalidatePath("/admin/billing");
    revalidatePath(`/admin/consultations/${invoice.patient_id}`);
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      status: "success",
      message: "Payment updated.",
      data: { amountPaid: invoice.amount_paid, status: invoice.status },
    };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("updateInvoicePayment", error, "Failed to update the payment. Please try again."),
    };
  }
}
