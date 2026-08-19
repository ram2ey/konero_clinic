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
 * last month's. Unlike the portal's payment trends (kept neutral-toned —
 * "you paid more" isn't unambiguously good or bad for a patient), more
 * new patients / consultations is unambiguously growth for the clinic, so
 * this one does color the direction.
 */
function growthTrend(rows: { created_at: string }[]) {
  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonth = rows.filter((r) => monthKey(new Date(r.created_at)) === thisMonthKey).length;
  const lastMonth = rows.filter((r) => monthKey(new Date(r.created_at)) === lastMonthKey).length;

  // Only show a delta when there's a real prior-month figure to compare
  // against — a percentage change from zero is undefined, not "0%" or "∞%".
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
    <Card>
      <CardHeader>
        <CardTitle>At a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Patients on record"
            value={String(patients.length)}
            trend={growthTrend(patients)}
          />
          <StatTile
            label="Consultations recorded"
            value={String(consultations.length)}
            trend={growthTrend(consultations)}
          />
          <StatTile label="Pending balance" value={formatCurrency(pendingAmount)} />
          <StatTile label="Overdue balance" value={formatCurrency(overdueAmount)} />
          <StatTile label="Active diagnoses" value={String(activeDiagnoses)} />
          <StatTile label="Active prescriptions" value={String(activePrescriptions)} />
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
