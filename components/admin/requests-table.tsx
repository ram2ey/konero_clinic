"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  Video,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { updateRequestStatus } from "@/actions/process-consultation-request";
import { ApproveRequestButton } from "@/components/admin/request-actions-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ConsultationRequestItem = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  dob: string | null;
  sex: string | null;
  preferred_mode: "in_person" | "virtual" | "flexible";
  preferred_time: string | null;
  reason: string | null;
  status: "pending" | "approved" | "contacted" | "rejected";
  admin_notes: string | null;
  converted_patient_id: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_TABS = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved & Converted" },
  { value: "rejected", label: "Declined" },
] as const;

function ModeBadge({ mode }: { mode: string }) {
  switch (mode) {
    case "virtual":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          <Video className="size-3" />
          <span>Virtual</span>
        </span>
      );
    case "in_person":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-600/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
          <MapPin className="size-3" />
          <span>In-Person</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          <span>Flexible</span>
        </span>
      );
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Pending</span>
        </span>
      );
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="size-3" />
          <span>Approved</span>
        </span>
      );
    case "contacted":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-400 border border-sky-500/30">
          <Phone className="size-3" />
          <span>Contacted</span>
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
          <XCircle className="size-3" />
          <span>Declined</span>
        </span>
      );
    default:
      return null;
  }
}

export function RequestsTable({
  initialRequests,
}: {
  initialRequests: ConsultationRequestItem[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [, startTransition] = useTransition();

  const handleStatusChange = (
    requestId: string,
    newStatus: "pending" | "contacted" | "rejected"
  ) => {
    startTransition(async () => {
      const res = await updateRequestStatus(requestId, newStatus);
      if (res.status === "success") {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
        );
      }
    });
  };

  const filtered = requests.filter((item) => {
    // Tab filter
    if (activeTab !== "all" && item.status !== activeTab) {
      return false;
    }
    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.full_name.toLowerCase().includes(q);
      const matchEmail = item.email.toLowerCase().includes(q);
      const matchPhone = item.phone.toLowerCase().includes(q);
      const matchReason = item.reason?.toLowerCase().includes(q) ?? false;
      return matchName || matchEmail || matchPhone || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs & Search Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? requests.length
                : requests.filter((r) => r.status === tab.value).length;

            const isCurrent = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-6 opacity-60" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No consultation requests found
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search
              ? "No requests match your current search query."
              : activeTab === "pending"
              ? "All caught up! There are no pending requests waiting for review."
              : "Share your booking link (the /request-consultation page) on social media to receive patient requests."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cleanPhone = item.phone.replace(/[^0-9]/g, "");

            return (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden border transition-all duration-200",
                  item.status === "pending"
                    ? "border-amber-500/40 bg-card shadow-xs ring-1 ring-amber-500/20"
                    : "border-border/80 bg-card hover:border-primary/40"
                )}
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Top Bar: Name, Badges, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-foreground">
                          {item.full_name}
                        </h3>
                        <StatusBadge status={item.status} />
                        <ModeBadge mode={item.preferred_mode} />
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Received on {formatDateTime(item.created_at)}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 pt-1 sm:pt-0">
                      {item.status !== "approved" ? (
                        <>
                          <ApproveRequestButton
                            requestId={item.id}
                            clientName={item.full_name}
                            clientEmail={item.email}
                            clientPhone={item.phone}
                            onApproved={(convertedPatientId) =>
                              setRequests((prev) =>
                                prev.map((r) =>
                                  r.id === item.id
                                    ? { ...r, status: "approved", converted_patient_id: convertedPatientId }
                                    : r
                                )
                              )
                            }
                          />

                          {item.status !== "contacted" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => handleStatusChange(item.id, "contacted")}
                              className="h-7 text-xs font-medium text-sky-700 dark:text-sky-400 hover:bg-sky-500/10"
                            >
                              <Phone className="size-3 mr-1" />
                              <span>Mark Contacted</span>
                            </Button>
                          )}

                          {item.status !== "rejected" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleStatusChange(item.id, "rejected")}
                              className="h-7 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <span>Decline</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          size="xs"
                          className="h-7 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          <Link href={`/admin/consultations/${item.converted_patient_id}`}>
                            <UserCheck className="size-3.5 mr-1" />
                            <span>View Patient Chart</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Contact Row (Phone, WhatsApp, Email, DOB) */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border-y border-border/50 py-2.5">
                    {/* Phone & WhatsApp */}
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-primary" />
                      <a
                        href={`tel:${item.phone}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.phone}
                      </a>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Message on WhatsApp"
                          className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <MessageSquare className="size-2.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5 text-primary" />
                      <a
                        href={`mailto:${item.email}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.email}
                      </a>
                    </div>

                    {/* Date of Birth & Sex */}
                    {item.dob && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>DOB: {item.dob}</span>
                      </div>
                    )}
                    {item.sex && (
                      <span className="capitalize bg-muted px-2 py-0.5 rounded-sm text-[10px] font-medium text-muted-foreground">
                        {item.sex}
                      </span>
                    )}

                    {/* Preferred Time */}
                    {item.preferred_time && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3 text-primary" />
                        <span>Prefers: {item.preferred_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Reason for Consultation */}
                  {item.reason && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Presenting Concerns / Notes:
                      </p>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/30 p-2.5 border border-border/60">
                        {item.reason}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
