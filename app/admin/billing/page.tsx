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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} invoice{items.length === 1 ? "" : "s"}
          {amountDue > 0 ? ` · ${formatCurrency(amountDue)} due` : ""}
        </p>
      </header>

      <BillingList invoices={billingInvoices} />
    </main>
  );
}
