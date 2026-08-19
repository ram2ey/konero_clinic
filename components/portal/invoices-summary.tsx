import { Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { InvoiceStatusActions } from "@/components/admin/invoice-status-actions";
import { StatTile } from "./stat-tile";
import { InvoiceStatusBadge } from "./status-badge";

type Invoice = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  description: string | null;
  created_at: string;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export async function InvoicesSummary({
  patientId,
  isAdmin = false,
}: {
  patientId: string;
  isAdmin?: boolean;
}) {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, status, description, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<Invoice[]>();

  const items = invoices ?? [];
  const amountDue = items
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const paidThisMonth = items
    .filter((i) => i.status === "paid" && monthKey(new Date(i.created_at)) === thisMonthKey)
    .reduce((sum, i) => sum + i.amount, 0);
  const paidLastMonth = items
    .filter((i) => i.status === "paid" && monthKey(new Date(i.created_at)) === lastMonthKey)
    .reduce((sum, i) => sum + i.amount, 0);
  // Only show a delta when there's a real prior-month figure to compare
  // against — a percentage change from zero is undefined, not "0%" or "∞%".
  const paidTrend =
    paidLastMonth > 0
      ? { changePercent: ((paidThisMonth - paidLastMonth) / paidLastMonth) * 100 }
      : undefined;

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-4" />
            </div>
            <CardTitle className="text-lg font-bold">Billing &amp; Invoices</CardTitle>
          </div>
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {items.length} Total
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            label="Outstanding Balance"
            value={formatCurrency(amountDue)}
            icon={Receipt}
            className={amountDue > 0 ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10" : ""}
          />
          <StatTile
            label="Paid this month"
            value={formatCurrency(paidThisMonth)}
            trend={paidTrend}
            icon={Receipt}
          />
        </div>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-2">
              Recent Transactions
            </h3>
            <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.description ?? "Medical Consultation & Services"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                    <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                    <InvoiceStatusBadge status={item.status} />
                    {isAdmin && (
                      <InvoiceStatusActions
                        invoiceId={item.id}
                        currentStatus={item.status}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Receipt className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No invoices on file.</p>
    </div>
  );
}

export function InvoicesSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-3">
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
