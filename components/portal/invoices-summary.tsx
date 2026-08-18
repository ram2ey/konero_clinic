import { Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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

export async function InvoicesSummary({ patientId }: { patientId: string }) {
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
    <Card>
      <CardHeader>
        <CardTitle>Financials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Amount due" value={formatCurrency(amountDue)} />
          <StatTile label="Paid this month" value={formatCurrency(paidThisMonth)} trend={paidTrend} />
        </div>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.description ?? "Invoice"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
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
