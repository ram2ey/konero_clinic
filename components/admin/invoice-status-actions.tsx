"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { updateInvoiceStatus } from "@/actions/update-invoice-status";
import { Button } from "@/components/ui/button";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  onStatusUpdated,
}: {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  onStatusUpdated?: (nextStatus: InvoiceStatus) => void;
}) {
  const [status, setStatus] = useState<InvoiceStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(nextStatus: InvoiceStatus) {
    if (nextStatus === status || loading) return;
    const prevStatus = status;
    setStatus(nextStatus);
    setLoading(true);
    setError(null);

    const result = await updateInvoiceStatus({ invoiceId, status: nextStatus });
    setLoading(false);

    if (result.status !== "success") {
      setStatus(prevStatus);
      setError(result.message ?? "Failed to update status.");
      return;
    }

    onStatusUpdated?.(nextStatus);
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {status !== "paid" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handleStatusChange("paid")}
          className="h-7 gap-1 rounded-lg border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3 stroke-[2.5]" />
          )}
          <span>Mark Paid</span>
        </Button>
      )}

      <div className="relative inline-flex items-center">
        <select
          value={status}
          disabled={loading}
          onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
          aria-label="Change invoice status"
          className="h-7 cursor-pointer appearance-none rounded-lg border border-border/80 bg-background/80 py-0 pl-2.5 pr-6 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-muted-foreground/70" />
      </div>

      {error && (
        <span role="alert" className="text-[11px] text-destructive font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
