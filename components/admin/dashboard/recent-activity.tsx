import { CalendarClock, FileText, Receipt, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { InvoiceStatusBadge, VisitTypeBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const FEED_LIMIT = 8;
const PER_TABLE_LIMIT = 8;

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
type VisitType = "first_visit" | "review";

type Row = { key: string; createdAt: string; node: ReactNode };

function Entry({
  href,
  icon: Icon,
  label,
  createdAt,
  badge,
}: {
  href: string;
  icon: typeof UserPlus;
  label: string;
  createdAt: string;
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground hover:underline">{label}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(createdAt)}</p>
      </div>
      {badge}
    </Link>
  );
}

export async function RecentActivity() {
  const supabase = await createClient();

  const [patientsResult, consultationsResult, invoicesResult, labReportsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "patient")
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
    supabase
      .from("consultations")
      .select("id, patient_id, visit_type, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
    supabase
      .from("invoices")
      .select("id, patient_id, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
    supabase
      .from("lab_reports")
      .select("id, patient_id, test_name, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_TABLE_LIMIT),
  ]);

  const patients = patientsResult.data ?? [];
  const consultations = (consultationsResult.data ?? []) as { id: string; patient_id: string; visit_type: VisitType; created_at: string }[];
  const invoices = (invoicesResult.data ?? []) as { id: string; patient_id: string; amount: number; status: InvoiceStatus; created_at: string }[];
  const labReports = labReportsResult.data ?? [];

  // profiles rows already carry their own name; the other three tables
  // only carry patient_id, so one follow-up lookup resolves the rest —
  // same two-query shape as the billing snapshot used to use.
  const patientIds = Array.from(
    new Set([...consultations, ...invoices, ...labReports].map((r) => r.patient_id)),
  );
  const { data: lookupProfiles } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map<string, string>();
  for (const p of patients) nameById.set(p.id, p.full_name ?? "Unnamed patient");
  for (const p of lookupProfiles ?? []) nameById.set(p.id, p.full_name ?? "Unnamed patient");

  const rows: Row[] = [
    ...patients.map((p) => ({
      key: `patient-${p.id}`,
      createdAt: p.created_at,
      node: (
        <Entry
          href={`/admin/consultations/${p.id}`}
          icon={UserPlus}
          label={`${p.full_name ?? "Unnamed patient"} registered`}
          createdAt={p.created_at}
        />
      ),
    })),
    ...consultations.map((c) => ({
      key: `consultation-${c.id}`,
      createdAt: c.created_at,
      node: (
        <Entry
          href={`/admin/consultations/${c.patient_id}`}
          icon={CalendarClock}
          label={`Consultation recorded for ${nameById.get(c.patient_id) ?? "Unknown patient"}`}
          createdAt={c.created_at}
          badge={<VisitTypeBadge visitType={c.visit_type} />}
        />
      ),
    })),
    ...invoices.map((i) => ({
      key: `invoice-${i.id}`,
      createdAt: i.created_at,
      node: (
        <Entry
          href={`/admin/consultations/${i.patient_id}/financials`}
          icon={Receipt}
          label={`Invoice ${formatCurrency(i.amount)} for ${nameById.get(i.patient_id) ?? "Unknown patient"}`}
          createdAt={i.created_at}
          badge={<InvoiceStatusBadge status={i.status} />}
        />
      ),
    })),
    ...labReports.map((l) => ({
      key: `lab-${l.id}`,
      createdAt: l.created_at,
      node: (
        <Entry
          href={`/admin/consultations/${l.patient_id}`}
          icon={FileText}
          label={`${l.test_name} uploaded for ${nameById.get(l.patient_id) ?? "Unknown patient"}`}
          createdAt={l.created_at}
        />
      ),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, FEED_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.key} className="py-3 first:pt-0 last:pb-0">
                {row.node}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-3" />}
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 size-4 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
