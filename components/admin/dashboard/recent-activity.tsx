import { Activity, CalendarClock, FileText, Receipt, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { InvoiceStatusBadge, VisitTypeBadge } from "@/components/portal/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { query } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";

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
    <Link
      href={href}
      prefetch={true}
      className="group flex items-center justify-between gap-3 rounded-xl p-2.5 transition-all duration-150 hover:bg-muted/60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(createdAt)}</p>
        </div>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </Link>
  );
}

export async function RecentActivity() {
  const [patientsResult, consultationsResult, invoicesResult, labReportsResult] = await Promise.all([
    query<{ id: string; full_name: string | null; created_at: string }>(
      `select id, full_name, created_at from public.profiles
        where role = 'patient' order by created_at desc limit ${PER_TABLE_LIMIT}`,
    ),
    query<{ id: string; patient_id: string; visit_type: VisitType; created_at: string }>(
      `select id, patient_id, visit_type, created_at from public.consultations
        order by created_at desc limit ${PER_TABLE_LIMIT}`,
    ),
    query<{ id: string; patient_id: string; amount: number; status: InvoiceStatus; created_at: string }>(
      `select id, patient_id, amount::float8 as amount, status, created_at from public.invoices
        order by created_at desc limit ${PER_TABLE_LIMIT}`,
    ),
    query<{ id: string; patient_id: string; test_name: string; created_at: string }>(
      `select id, patient_id, test_name, created_at from public.lab_reports
        order by created_at desc limit ${PER_TABLE_LIMIT}`,
    ),
  ]);

  const patients = patientsResult.rows;
  const consultations = consultationsResult.rows;
  const invoices = invoicesResult.rows;
  const labReports = labReportsResult.rows;

  // profiles rows already carry their own name; the other three tables
  // only carry patient_id, so one follow-up lookup resolves the rest.
  const patientIds = Array.from(
    new Set([...consultations, ...invoices, ...labReports].map((r) => r.patient_id)),
  );
  const { rows: lookupProfiles } = patientIds.length
    ? await query<{ id: string; full_name: string | null }>(
        `select id, full_name from public.profiles where id = any($1::uuid[])`,
        [patientIds],
      )
    : { rows: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map<string, string>();
  for (const p of patients) nameById.set(p.id, p.full_name ?? "Unnamed patient");
  for (const p of lookupProfiles) nameById.set(p.id, p.full_name ?? "Unnamed patient");

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
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" />
          </div>
          <CardTitle className="text-lg font-bold">Recent Clinical Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent practice activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-border/60 space-y-1">
            {rows.map((row) => (
              <div key={row.key} className="pt-1.5 first:pt-0">
                {row.node}
              </div>
            ))}
          </div>
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
