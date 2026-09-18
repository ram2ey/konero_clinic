"use client";

import { Banknote } from "lucide-react";
import { useState, type FormEvent } from "react";

import { updateInvoicePayment } from "@/actions/update-invoice-payment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export function InvoicePaymentDialog({
  invoiceId,
  amount,
  amountPaid,
  disabled = false,
  onPaymentUpdated,
}: {
  invoiceId: string;
  amount: number;
  amountPaid: number;
  disabled?: boolean;
  onPaymentUpdated?: (amountPaid: number, status: InvoiceStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amountPaid));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValue(String(amountPaid));
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateInvoicePayment({ invoiceId, amountPaid: value });
    setPending(false);
    if (result.status !== "success" || !result.data) {
      setError(result.fieldErrors?.amountPaid?.[0] ?? result.message ?? "Failed to update the payment.");
      return;
    }

    onPaymentUpdated?.(result.data.amountPaid, result.data.status);
    setOpen(false);
  }

  const entered = Number(value) || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled} className="h-7 gap-1 px-2.5">
          <Banknote className="size-3" />
          Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update amount paid</DialogTitle>
          <DialogDescription>
            Enter the patient&apos;s total payments received for this {formatCurrency(amount)} invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`amount-paid-${invoiceId}`} className="text-sm font-medium">Total amount paid (GHS)</label>
            <Input
              id={`amount-paid-${invoiceId}`}
              type="number"
              min="0"
              max={amount}
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={pending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Outstanding balance: {formatCurrency(Math.max(0, amount - entered))}
            </p>
          </div>

          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
