import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/portal/stat-tile";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function OverviewStats() {
  const supabase = await createClient();

  const [patientsResult, dueInvoicesResult, consultationsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
    supabase.from("invoices").select("amount").in("status", ["pending", "overdue"]),
    supabase.from("consultations").select("id", { count: "exact", head: true }),
  ]);

  const patientCount = patientsResult.count ?? 0;
  const amountDue = (dueInvoicesResult.data ?? []).reduce((sum, i) => sum + i.amount, 0);
  const consultationCount = consultationsResult.count ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>At a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Patients on record" value={String(patientCount)} />
          <StatTile label="Outstanding balance" value={formatCurrency(amountDue)} />
          <StatTile label="Consultations recorded" value={String(consultationCount)} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
