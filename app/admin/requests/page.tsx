import {
  Clock,
  Inbox,
  Phone,
  Share2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ConsultationRequestItem,
  RequestsTable,
} from "@/components/admin/requests-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export const metadata = {
  title: "Consultation Requests | Admin Dashboard",
};

export default async function AdminRequestsPage() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    redirect("/login");
  }

  let requests: ConsultationRequestItem[] = [];
  try {
    const { rows } = await query<ConsultationRequestItem>(
      `select * from public.consultation_requests order by created_at desc`,
    );
    requests = rows;
  } catch (error) {
    console.error("[AdminRequestsPage] Error fetching requests:", error);
  }

  const total = requests.length;
  const pending = requests.filter((r) => r.status === "pending").length;
  const contacted = requests.filter((r) => r.status === "contacted").length;
  const approved = requests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Inbox className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Consultation Requests
              </h1>
              <p className="text-xs text-muted-foreground">
                Review and onboard incoming client requests from your website &amp; bio links
              </p>
            </div>
          </div>
        </div>

        {/* Action button to test / share booking link */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Link href="/request-consultation" target="_blank" rel="noopener noreferrer">
              <Share2 className="size-3.5" />
              <span>Open Public Booking Page</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total */}
        <Card className="p-4 bg-card border-border/80 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Total Requests
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
        </Card>

        {/* Pending */}
        <Card className="p-4 bg-amber-500/5 border-amber-500/30 shadow-2xs dark:bg-amber-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block flex items-center gap-1">
            <Clock className="size-3" />
            Pending Review
          </span>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {pending}
          </p>
        </Card>

        {/* Contacted */}
        <Card className="p-4 bg-sky-500/5 border-sky-500/30 shadow-2xs dark:bg-sky-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400 block flex items-center gap-1">
            <Phone className="size-3" />
            Contacted
          </span>
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1">
            {contacted}
          </p>
        </Card>

        {/* Approved & Converted */}
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/30 shadow-2xs dark:bg-emerald-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
            <UserCheck className="size-3" />
            Approved &amp; Converted
          </span>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {approved}
          </p>
        </Card>
      </div>

      {/* Main Interactive Table & Filter View */}
      <RequestsTable initialRequests={requests} />
    </div>
  );
}
