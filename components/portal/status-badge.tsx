import { Badge } from "@/components/ui/badge";

type RecordStatus = "active" | "resolved" | "cancelled";
type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

const RECORD_STATUS_STYLES: Record<RecordStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  resolved: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  active: "Active",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return (
    <Badge variant="outline" className={RECORD_STATUS_STYLES[status]}>
      {RECORD_STATUS_LABEL[status]}
    </Badge>
  );
}

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  overdue: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={INVOICE_STATUS_STYLES[status]}>
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  );
}

type VisitType = "first_visit" | "review";

const VISIT_TYPE_STYLES: Record<VisitType, string> = {
  first_visit: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
  review: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  first_visit: "1st Visit",
  review: "Review",
};

export function VisitTypeBadge({ visitType }: { visitType: VisitType }) {
  return (
    <Badge variant="outline" className={VISIT_TYPE_STYLES[visitType]}>
      {VISIT_TYPE_LABEL[visitType]}
    </Badge>
  );
}

type InformantReliability = "reliable" | "partially_reliable" | "unreliable";

const INFORMANT_RELIABILITY_STYLES: Record<InformantReliability, string> = {
  reliable: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  partially_reliable: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  unreliable: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const INFORMANT_RELIABILITY_LABEL: Record<InformantReliability, string> = {
  reliable: "Reliable",
  partially_reliable: "Partially reliable",
  unreliable: "Unreliable",
};

export function InformantReliabilityBadge({ reliability }: { reliability: InformantReliability }) {
  return (
    <Badge variant="outline" className={INFORMANT_RELIABILITY_STYLES[reliability]}>
      {INFORMANT_RELIABILITY_LABEL[reliability]}
    </Badge>
  );
}
