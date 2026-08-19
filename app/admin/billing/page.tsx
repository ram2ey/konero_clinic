import { BillingList, type BillingInvoice } from "@/components/admin/billing-list";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, patient_id, amount, status, description, created_at")
    .order("created_at", { ascending: false })
    .returns<InvoiceRow[]>();

  const items = invoices ?? [];

  // Separate lookup rather than an embedded select — invoices has a
  // single FK to profiles so an embed would be unambiguous here, but
  // lab_reports (patient_id + uploaded_by) doesn't have that guarantee,
  // and matching the same two-query shape across both admin roll-ups
  // keeps them consistent rather than mixing approaches.
  const patientIds = Array.from(new Set(items.map((i) => i.patient_id)));
  const { data: patients } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name ?? "Unnamed patient"]));

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
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5">
          <span>Dr. Alex Vico-Korda Practice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Billing &amp; Financial Ledger
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {items.length} invoice{items.length === 1 ? "" : "s"} recorded across all patients
          {amountDue > 0 ? ` · ${formatCurrency(amountDue)} total outstanding balance` : ""}
        </p>
      </div>

      <BillingList invoices={billingInvoices} />
    </main>
  );
}
