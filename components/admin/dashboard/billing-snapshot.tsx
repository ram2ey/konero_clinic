import { Receipt } from "lucide-react";
import Link from "next/link";

import { InvoiceStatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

const PREVIEW_LIMIT = 5;

export async function BillingSnapshot() {
  const supabase = await createClient();

  // Same two-query shape as app/admin/billing/page.tsx (a separate lookup
  // rather than an embedded select) — keeping both admin roll-ups
  // consistent rather than mixing approaches.
  const { data: dueInvoices } = await supabase
    .from("invoices")
    .select("id, patient_id, amount, status, description, created_at")
    .in("status", ["pending", "overdue"])
    .order("created_at", { ascending: false })
    .returns<InvoiceRow[]>();

  const items = dueInvoices ?? [];
  const amountDue = items.reduce((sum, i) => sum + i.amount, 0);
  const preview = items.slice(0, PREVIEW_LIMIT);

  const patientIds = Array.from(new Set(preview.map((i) => i.patient_id)));
  const { data: patients } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name ?? "Unnamed patient"]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding invoices</CardTitle>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/billing">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {items.length} invoice{items.length === 1 ? "" : "s"} pending or overdue
          {amountDue > 0 ? ` · ${formatCurrency(amountDue)} due` : ""}
        </p>

        {preview.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Receipt className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nothing outstanding — all invoices are settled.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {preview.map((item) => (
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
  );
}

export function BillingSnapshotSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="pt-2">
          {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-3 py-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
