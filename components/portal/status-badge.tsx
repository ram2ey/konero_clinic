import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RecordStatus = "active" | "resolved" | "cancelled";
type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

const RECORD_STATUS_CONFIG: Record<
  RecordStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    dotClass: "bg-emerald-500 shadow-xs shadow-emerald-500/50",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  resolved: {
    label: "Resolved",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-rose-500",
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  const config = RECORD_STATUS_CONFIG[status] ?? RECORD_STATUS_CONFIG.resolved;
  return (
    <Badge
      variant="outline"
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 font-medium shadow-xs text-xs rounded-full", config.badgeClass)}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </Badge>
  );
}

const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-amber-500 animate-pulse-subtle",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  },
  paid: {
    label: "Paid",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  overdue: {
    label: "Overdue",
    dotClass: "bg-rose-500 animate-pulse-subtle",
    badgeClass: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300",
  },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 font-medium shadow-xs text-xs rounded-full", config.badgeClass)}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </Badge>
  );
}

type VisitType = "first_visit" | "review";

const VISIT_TYPE_CONFIG: Record<
  VisitType,
  { label: string; badgeClass: string }
> = {
  first_visit: {
    label: "1st Visit",
    badgeClass: "border-blue-600/25 bg-blue-600/10 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300",
  },
  review: {
    label: "Review",
    badgeClass: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300",
  },
};

export function VisitTypeBadge({ visitType }: { visitType: VisitType }) {
  const config = VISIT_TYPE_CONFIG[visitType] ?? VISIT_TYPE_CONFIG.review;
  return (
    <Badge variant="outline" className={cn("px-2.5 py-0.5 font-medium shadow-xs text-xs rounded-full", config.badgeClass)}>
      {config.label}
    </Badge>
  );
}

type InformantReliability = "reliable" | "partially_reliable" | "unreliable";

const INFORMANT_RELIABILITY_CONFIG: Record<
  InformantReliability,
  { label: string; dotClass: string; badgeClass: string }
> = {
  reliable: {
    label: "Reliable",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  partially_reliable: {
    label: "Partially reliable",
    dotClass: "bg-amber-500",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  },
  unreliable: {
    label: "Unreliable",
    dotClass: "bg-rose-500",
    badgeClass: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

export function InformantReliabilityBadge({ reliability }: { reliability: InformantReliability }) {
  const config = INFORMANT_RELIABILITY_CONFIG[reliability] ?? INFORMANT_RELIABILITY_CONFIG.reliable;
  return (
    <Badge
      variant="outline"
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 font-medium shadow-xs text-xs rounded-full", config.badgeClass)}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </Badge>
  );
}
