"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createInvoice } from "@/actions/create-invoice";
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
import { selectClass, textareaClass } from "@/lib/form-ui";

export type InvoicePatientOption = { id: string; full_name: string | null };

export function CreateInvoiceDialog({ patients }: { patients: InvoicePatientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  function reset() {
    setPatientId("");
    setAmount("");
    setDescription("");
    setError(null);
    setFieldErrors(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors(null);
    const result = await createInvoice({ patientId, amount, description });
    setPending(false);

    if (result.status !== "success") {
      setError(result.message ?? "Failed to create the invoice.");
      setFieldErrors(result.fieldErrors ?? null);
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !pending) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={patients.length === 0} className="gap-1.5 shadow-xs shadow-primary/25">
          <Plus className="size-4" />
          New invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create patient invoice</DialogTitle>
          <DialogDescription>This invoice is independent of a consultation and starts as pending.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invoice-patient" className="text-sm font-medium">Patient</label>
            <select
              id="invoice-patient"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              disabled={pending}
              aria-invalid={fieldErrors?.patientId ? true : undefined}
              className={selectClass}
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.full_name ?? "Unnamed patient"}</option>
              ))}
            </select>
            {fieldErrors?.patientId?.[0] && <p className="text-xs text-destructive">{fieldErrors.patientId[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invoice-amount" className="text-sm font-medium">Amount (GHS)</label>
            <Input
              id="invoice-amount"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={pending}
              aria-invalid={fieldErrors?.amount ? true : undefined}
            />
            {fieldErrors?.amount?.[0] && <p className="text-xs text-destructive">{fieldErrors.amount[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invoice-description" className="text-sm font-medium">Description</label>
            <textarea
              id="invoice-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={pending}
              maxLength={500}
              rows={3}
              aria-invalid={fieldErrors?.description ? true : undefined}
              className={textareaClass}
              placeholder="e.g. Medical report and administrative fee"
            />
            {fieldErrors?.description?.[0] && <p className="text-xs text-destructive">{fieldErrors.description[0]}</p>}
          </div>

          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invoice"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
