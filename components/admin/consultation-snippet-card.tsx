"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  ConsultationDetail,
  Vitals,
} from "@/components/admin/consultation-detail-view";
import { ConsultationModal } from "@/components/admin/consultation-modal";
import { VisitTypeBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
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

export function ConsultationSnippetCard({
  item,
  patientId,
  patientName,
}: {
  item: ConsultationDetail;
  patientId: string;
  patientName?: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const vSummary = vitalsSummary(item.vitals);
  const summaryText =
    item.assessment?.summary ||
    item.assessment?.management_plan ||
    item.assessment?.phenomenology;

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-200 hover:border-primary/40 hover:shadow-xs">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
            {formatDateTime(item.created_at)}
          </p>
          <VisitTypeBadge visitType={item.visit_type} />
        </div>

        {vSummary && (
          <p className="inline-flex items-center rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
            {vSummary}
          </p>
        )}

        {/* Truncated preview or Expanded Inline Content */}
        {!isExpanded ? (
          <div>
            {summaryText ? (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {summaryText}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70 italic">
                Clinical assessment recorded
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 animate-in fade-in-50 duration-200">
            {item.assessment?.summary && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Summary
                </p>
                <p className="mt-0.5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {item.assessment.summary}
                </p>
              </div>
            )}
            {item.assessment?.management_plan && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Management Plan
                </p>
                <p className="mt-0.5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {item.assessment.management_plan}
                </p>
              </div>
            )}
            {item.assessment?.phenomenology && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phenomenology
                </p>
                <p className="mt-0.5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {item.assessment.phenomenology}
                </p>
              </div>
            )}
            {item.assessment?.risk_assessment && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Risk Assessment
                </p>
                <p className="mt-0.5 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {item.assessment.risk_assessment}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="mt-3.5 border-t border-border/50 pt-2.5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 px-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3 text-muted-foreground" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3 text-muted-foreground" />
              <span>Expand notes</span>
            </>
          )}
        </Button>

        <div className="flex items-center gap-1.5">
          <ConsultationModal
            consultation={item}
            patientName={patientName}
            triggerText="Full Record"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] px-2 text-primary hover:bg-primary/10"
          />

          <Link
            href={`/admin/consultations/${patientId}?tab=consultation`}
            scroll={false}
            title="Go to Consultations tab"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
