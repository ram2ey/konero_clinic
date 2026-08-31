import { BillingList, type BillingInvoice } from "@/components/admin/billing-list";
import { query } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

type InvoiceRow = {
  id: string;
  patient_id: string;
  amount: number;
  status: InvoiceStatus;
  description: string | null;
  created_at: string;
};

export default async function BillingPage() {
  const { rows: items } = await query<InvoiceRow>(
    `select id, patient_id, amount::float8 as amount, status, description, created_at
       from public.invoices
      order by created_at desc`,
  );

  const patientIds = Array.from(new Set(items.map((i) => i.patient_id)));
  const { rows: patients } = patientIds.length
    ? await query<{ id: string; full_name: string | null }>(
        `select id, full_name from public.profiles where id = any($1::uuid[])`,
        [patientIds],
      )
    : { rows: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map(patients.map((p) => [p.id, p.full_name ?? "Unnamed patient"]));

  const billingInvoices: BillingInvoice[] = items.map((item) => ({
    ...item,
    patientName: nameById.get(item.patient_id) ?? "Unknown patient",
  }));

  // Always the total across every invoice, not just whatever status tab
  // happens to be selected client-side — "amount due" describing only
  // the current filter would be a confusing (and previously actual)
  // side effect of how the filtering used to work.
  const amountDue = items
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Billing &amp; Financial Ledger
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {items.length} invoice{items.length === 1 ? "" : "s"} recorded across all patients
          {amountDue > 0 ? ` · ${formatCurrency(amountDue)} total outstanding balance` : ""}
        </p>
      </div>

      <BillingList invoices={billingInvoices} />
    </main>
  );
}
