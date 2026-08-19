"use client";

import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

import {
  ConsultationDetail,
  ConsultationDetailView,
  Vitals,
} from "@/components/admin/consultation-detail-view";
import { ConsultationModal } from "@/components/admin/consultation-modal";
import { VisitTypeBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

function vitalsSummary(vitals: Vitals): string | null {
  if (!vitals) return null;
  const parts: string[] = [];
  if (vitals.blood_pressure?.systolic && vitals.blood_pressure?.diastolic) {
    parts.push(`BP ${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}`);
  }
  if (vitals.heart_rate_bpm) parts.push(`HR ${vitals.heart_rate_bpm}`);
  if (vitals.temperature_celsius) parts.push(`Temp ${vitals.temperature_celsius}°C`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function PreviousConsultationsList({
  items,
  patientName,
}: {
  items: ConsultationDetail[];
  patientName?: string | null;
}) {
  // Set of opened consultation IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(items.length === 1 ? [items[0].id] : [])
  );

  const allExpanded = items.length > 0 && expandedIds.size === items.length;

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
          <ClipboardList className="size-6 opacity-60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mt-2">
          No clinical consultations recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {items.length} recorded consultation{items.length === 1 ? "" : "s"}
        </span>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={toggleAll}
          className="h-7 text-xs font-medium gap-1.5"
        >
          {allExpanded ? (
            <>
              <ChevronUp className="size-3.5" />
              <span>Collapse all</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              <span>Expand all</span>
            </>
          )}
        </Button>
      </div>

      {/* Consultations List */}
      <div className="space-y-3.5">
        {items.map((item) => {
          const isOpen = expandedIds.has(item.id);
          const vSummary = vitalsSummary(item.vitals);
          const previewText =
            item.assessment?.summary ||
            item.assessment?.management_plan ||
            item.assessment?.phenomenology;

          return (
            <Card
              key={item.id}
              className={`overflow-hidden border transition-all duration-200 ${
                isOpen
                  ? "border-primary/40 bg-card shadow-xs ring-1 ring-primary/20"
                  : "border-border/80 bg-card hover:border-primary/30"
              }`}
            >
              {/* Header Bar / Expander Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card/60">
                <button
                  type="button"
                  onClick={() => toggleOne(item.id)}
                  className="flex-1 text-left flex items-start sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {formatDateTime(item.created_at)}
                      </p>
                      <VisitTypeBadge visitType={item.visit_type} />
                    </div>

                    {vSummary && (
                      <p className="inline-flex items-center rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                        {vSummary}
                      </p>
                    )}

                    {!isOpen && previewText && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                        {previewText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 mt-0.5 sm:mt-0 text-muted-foreground group-hover:text-foreground">
                    <span className="text-xs font-medium hidden sm:inline">
                      {isOpen ? "Hide notes" : "View notes"}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-primary" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </div>
                </button>

                {/* Direct Action Modal trigger */}
                <div className="flex items-center justify-end border-t border-border/40 pt-2 sm:border-0 sm:pt-0 sm:pl-3">
                  <ConsultationModal
                    consultation={item}
                    patientName={patientName}
                    triggerText="Reader View"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold text-primary hover:bg-primary/10"
                  />
                </div>
              </div>

              {/* Expanded In-Place Content */}
              {isOpen && (
                <div className="border-t border-border/60 bg-muted/15 p-5 space-y-5 animate-in fade-in-50 duration-200">
                  <ConsultationDetailView consultation={item} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
