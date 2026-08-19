import { Receipt } from "lucide-react";
import Link from "next/link";

import { InvoiceStatusBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
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

const STATUS_FILTERS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = STATUS_FILTERS.some((f) => f.value === status) ? (status as InvoiceStatus | "all") : "all";

  const supabase = await createClient();

  let request = supabase
    .from("invoices")
    .select("id, patient_id, amount, status, description, created_at")
    .order("created_at", { ascending: false });

  if (activeStatus !== "all") {
    request = request.eq("status", activeStatus);
  }

  const { data: invoices } = await request.returns<InvoiceRow[]>();
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

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {STATUS_FILTERS.map((f) => {
          const href = f.value === "all" ? "/admin/billing" : `/admin/billing?status=${f.value}`;
          const isActive = f.value === activeStatus;
          return (
            <Link
              key={f.value}
              href={href}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No invoices found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link href={`/admin/consultations/${item.patient_id}/financials`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground hover:underline">
                      {nameById.get(item.patient_id) ?? "Unknown patient"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description ?? "Invoice"} · {formatDate(item.created_at)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(item.amount)}</span>
                    <InvoiceStatusBadge status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
