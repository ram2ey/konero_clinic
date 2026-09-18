"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { InvoiceStatusActions } from "@/components/admin/invoice-status-actions";
import { InvoicePaymentDialog } from "@/components/admin/invoice-payment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export type BillingInvoice = {
  id: string;
  patient_id: string;
  amount: number;
  amount_paid: number;
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

export function BillingList({ invoices }: { invoices: BillingInvoice[] }) {
  const [invoiceList, setInvoiceList] = useState<BillingInvoice[]>(invoices);
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | "all">("all");

  useEffect(() => {
    setInvoiceList(invoices);
  }, [invoices]);

  function handleInvoiceUpdated(invoiceId: string, nextStatus: InvoiceStatus, amountPaid: number) {
    setInvoiceList((prev) =>
      prev.map((item) =>
        item.id === invoiceId ? { ...item, status: nextStatus, amount_paid: amountPaid } : item,
      ),
    );
  }

  const filtered = useMemo(
    () => (activeStatus === "all" ? invoiceList : invoiceList.filter((i) => i.status === activeStatus)),
    [invoiceList, activeStatus],
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
                ? invoiceList.length
                : invoiceList.filter((i) => i.status === f.value).length;

            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveStatus(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 outline-none select-none cursor-pointer ${
                  isActive
                    ? "bg-card text-primary font-bold shadow-xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold ${
                    isActive
                      ? "bg-primary/15 text-primary font-extrabold"
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
              Showing {filtered.length} of {invoiceList.length} records
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
                {invoiceList.length === 0 ? "No invoices on file." : `No ${activeLabel.toLowerCase()} invoices.`}
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
                    href={`/admin/consultations/${item.patient_id}?tab=financials`}
                    prefetch={true}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.patientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {item.description ?? "Medical Consultation"} &bull; {formatDate(item.created_at)}
                    </p>
                  </Link>
                  <div className="flex flex-wrap items-end gap-3.5 self-start sm:self-center">
                    <div className="grid grid-cols-3 gap-3 text-right">
                      <AmountColumn label="Invoice" value={item.amount} />
                      <AmountColumn label="Paid" value={item.amount_paid} />
                      <AmountColumn
                        label="Outstanding"
                        value={item.status === "cancelled" ? 0 : Math.max(0, item.amount - item.amount_paid)}
                        highlight={item.status !== "cancelled" && item.amount_paid < item.amount}
                      />
                    </div>
                    <InvoicePaymentDialog
                      invoiceId={item.id}
                      amount={item.amount}
                      amountPaid={item.amount_paid}
                      disabled={item.status === "cancelled"}
                      onPaymentUpdated={(amountPaid, status) => handleInvoiceUpdated(item.id, status, amountPaid)}
                    />
                    <InvoiceStatusActions
                      invoiceId={item.id}
                      currentStatus={item.status}
                      onStatusUpdated={(next, amountPaid) => handleInvoiceUpdated(item.id, next, amountPaid)}
                    />
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

function AmountColumn({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="min-w-18">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
