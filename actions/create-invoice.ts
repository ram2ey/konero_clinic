"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const createInvoiceSchema = z.object({
  patientId: z.string().uuid("Select a patient."),
  amount: z.coerce.number().positive("Amount must be greater than 0.").max(10_000_000),
  description: z.string().trim().min(2, "Add a short description.").max(500),
});

export type CreateInvoiceInput = z.input<typeof createInvoiceSchema>;

export async function createInvoice(input: CreateInvoiceInput): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) return { status: "error", message: admin.message };

    const parsed = createInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { patientId, amount, description } = parsed.data;
    const { rowCount } = await query(
      `insert into public.invoices (patient_id, amount, description)
       select id, $2, $3 from public.profiles where id = $1 and role = 'patient'`,
      [patientId, amount, description],
    );

    if (rowCount !== 1) return { status: "error", message: "Patient not found." };

    revalidatePath("/admin/billing");
    revalidatePath(`/admin/consultations/${patientId}`);
    revalidatePath("/admin");
    revalidatePath("/portal");
    return { status: "success", message: "Invoice created." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("createInvoice", error, "Failed to create the invoice. Please try again."),
    };
  }
}
