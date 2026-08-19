"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InvoiceStatusBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export type BillingInvoice = {
  id: string;
  patient_id: string;
  amount: number;
  status: InvoiceStatus;
  description: string | null;
  created_at: string;
  patientName: string;
};

const STATUS_FILTERS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Filtering happens entirely client-side: the full invoice list (fetched
 * once, server-side, when the page loads) is handed to this component,
 * and switching status tabs just re-filters what's already in memory —
 * no navigation, no new Supabase queries, no round-trip through
 * middleware/layout. This used to be <Link href="?status=...">, which
 * re-ran the entire request pipeline on every click regardless of how
 * little data there was to filter; that was the actual source of the
 * lag, not query performance.
 */
export function BillingList({ invoices }: { invoices: BillingInvoice[] }) {
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | "all">("all");

  const filtered = useMemo(
    () => (activeStatus === "all" ? invoices : invoices.filter((i) => i.status === activeStatus)),
    [invoices, activeStatus],
  );

  const activeLabel = STATUS_FILTERS.find((f) => f.value === activeStatus)?.label ?? "";

  return (
    <>
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {STATUS_FILTERS.map((f) => {
          const isActive = f.value === activeStatus;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveStatus(f.value)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {invoices.length === 0 ? "No invoices on file." : `No ${activeLabel.toLowerCase()} invoices.`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link href={`/admin/consultations/${item.patient_id}/financials`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground hover:underline">{item.patientName}</p>
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
    </>
  );
}
