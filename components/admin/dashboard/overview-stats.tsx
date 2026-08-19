import { AlertCircle, CalendarClock, Pill, Receipt, Stethoscope, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/portal/stat-tile";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/**
 * Growth trend for a table's row volume: this calendar month's count vs
 * last month's.
 */
function growthTrend(rows: { created_at: string }[]) {
  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonth = rows.filter((r) => monthKey(new Date(r.created_at)) === thisMonthKey).length;
  const lastMonth = rows.filter((r) => monthKey(new Date(r.created_at)) === lastMonthKey).length;

  if (lastMonth === 0) return undefined;
  return {
    changePercent: ((thisMonth - lastMonth) / lastMonth) * 100,
    tone: thisMonth >= lastMonth ? ("positive" as const) : ("negative" as const),
  };
}

export async function OverviewStats() {
  const supabase = await createClient();

  const [patientsResult, consultationsResult, invoicesResult, diagnosesResult, prescriptionsResult] =
    await Promise.all([
      supabase.from("profiles").select("created_at").eq("role", "patient"),
      supabase.from("consultations").select("created_at"),
      supabase.from("invoices").select("amount, status").in("status", ["pending", "overdue"]),
      supabase.from("diagnoses").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

  const patients = patientsResult.data ?? [];
  const consultations = consultationsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const activeDiagnoses = diagnosesResult.count ?? 0;
  const activePrescriptions = prescriptionsResult.count ?? 0;

  const pendingAmount = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.amount, 0);

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          <CardTitle className="text-lg font-bold">Key Clinical Metrics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Patients on record"
            value={String(patients.length)}
            trend={growthTrend(patients)}
            icon={Users}
          />
          <StatTile
            label="Consultations recorded"
            value={String(consultations.length)}
            trend={growthTrend(consultations)}
            icon={CalendarClock}
          />
          <StatTile
            label="Pending balance"
            value={formatCurrency(pendingAmount)}
            icon={Receipt}
            className={pendingAmount > 0 ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10" : ""}
          />
          <StatTile
            label="Overdue balance"
            value={formatCurrency(overdueAmount)}
            icon={AlertCircle}
            className={overdueAmount > 0 ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10" : ""}
          />
          <StatTile
            label="Active diagnoses"
            value={String(activeDiagnoses)}
            icon={Stethoscope}
          />
          <StatTile
            label="Active prescriptions"
            value={String(activePrescriptions)}
            icon={Pill}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>At a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
