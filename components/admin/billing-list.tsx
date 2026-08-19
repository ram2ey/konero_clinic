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
    <div className="space-y-6">
      {/* Segmented Filter Pills */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/60 p-1 shadow-xs">
          {STATUS_FILTERS.map((f) => {
            const isActive = f.value === activeStatus;
            const count =
              f.value === "all"
                ? invoices.length
                : invoices.filter((i) => i.status === f.value).length;

            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveStatus(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 outline-none select-none cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-4" />
              </div>
              <CardTitle className="text-lg font-bold">Invoices &amp; Ledger</CardTitle>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Showing {filtered.length} of {invoices.length} records
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                <Receipt className="size-6 opacity-60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {invoices.length === 0 ? "No invoices on file." : `No ${activeLabel.toLowerCase()} invoices.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 space-y-1">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 transition-all duration-150 hover:bg-muted/50"
                >
                  <Link
                    href={`/admin/consultations/${item.patient_id}/financials`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.patientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {item.description ?? "Medical Consultation"} &bull; {formatDate(item.created_at)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3.5 self-start sm:self-center">
                    <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                    <InvoiceStatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
