import {
  Activity,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { VisitTypeBadge } from "@/components/portal/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  MSE_COGNITION_LABELS_DB,
  MSE_FIELD_LABELS,
  MSE_THOUGHT_LABELS_DB,
} from "@/lib/mse-labels";
import { hasAnyValue } from "@/lib/utils";

export type Vitals = {
  blood_pressure?: { systolic: number | null; diastolic: number | null } | null;
  heart_rate_bpm?: number | null;
  temperature_celsius?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  oxygen_saturation_percent?: number | null;
} | null;

export type PhysicalExam = Record<
  | "general"
  | "anthropometric"
  | "cardiovascular"
  | "respiratory"
  | "gastrointestinal"
  | "cns"
  | "musculoskeletal"
  | "skin"
  | "other",
  string | null
> | null;

export type Thought = Record<
  "stream_flow" | "form" | "content" | "possession" | "control",
  string | null
> | null;

export type Cognition = Record<
  | "orientation"
  | "memory"
  | "attention"
  | "concentration"
  | "abstraction"
  | "general_fund_of_knowledge"
  | "judgement",
  string | null
> | null;

export type Mse = {
  appearance?: string | null;
  behaviour?: string | null;
  mood?: string | null;
  affect?: string | null;
  perception?: string | null;
  speech?: string | null;
  thought?: Thought;
  cognition?: Cognition;
  insight?: string | null;
} | null;

export type Assessment = {
  mse?: Mse;
  physical_exam?: PhysicalExam;
  summary?: string | null;
  phenomenology?: string | null;
  management_plan?: string | null;
  investigations?: string | null;
  risk_assessment?: string | null;
  prognosis?: string | null;
} | null;

export type ConsultationDetail = {
  id: string;
  created_at: string;
  vitals: Vitals;
  assessment: Assessment;
  visit_type: "first_visit" | "review";
};

const PHYSICAL_EXAM_LABELS: Record<string, string> = {
  general: "General Examination",
  anthropometric: "Anthropometric Assessment",
  cardiovascular: "Cardiovascular System (CVS)",
  respiratory: "Respiratory System",
  gastrointestinal: "Gastrointestinal System (GIT)",
  cns: "Central Nervous System (CNS)",
  musculoskeletal: "Musculoskeletal System",
  skin: "Skin & Integumentary",
  other: "Other Systemic Findings",
};

const MSE_CORE_ORDER = [
  "appearance",
  "behaviour",
  "speech",
  "mood",
  "affect",
  "perception",
] as const;

export function ConsultationDetailView({
  consultation,
}: {
  consultation: ConsultationDetail;
}) {
  const { created_at, vitals, assessment, visit_type } = consultation;
  const hasAssessment = hasAnyValue(assessment);

  return (
    <div className="space-y-6 text-sm text-foreground">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Consultation Date &amp; Time
          </p>
          <p className="text-base font-bold text-foreground">
            {formatDateTime(created_at)}
          </p>
        </div>
        <VisitTypeBadge visitType={visit_type} />
      </div>

      {/* Vitals Section */}
      {vitals && hasAnyValue(vitals) && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Vital Signs
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {vitals.blood_pressure?.systolic && vitals.blood_pressure?.diastolic && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Blood Pressure
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.blood_pressure.systolic}/{vitals.blood_pressure.diastolic}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">mmHg</span>
                </p>
              </div>
            )}

            {vitals.heart_rate_bpm && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Heart Rate
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.heart_rate_bpm}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">bpm</span>
                </p>
              </div>
            )}

            {vitals.temperature_celsius && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Temperature
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.temperature_celsius}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">°C</span>
                </p>
              </div>
            )}

            {vitals.respiratory_rate && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Resp. Rate
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.respiratory_rate}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">cpm</span>
                </p>
              </div>
            )}

            {vitals.oxygen_saturation_percent && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  SpO2
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.oxygen_saturation_percent}%
                </p>
              </div>
            )}

            {vitals.weight_kg && (
              <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Weight
                </span>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {vitals.weight_kg}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clinical Summary & Formulation */}
      {(assessment?.summary || assessment?.phenomenology) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Clinical Formulation &amp; Assessment
            </h4>
          </div>

          {assessment?.summary && (
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Clinical Summary
              </h5>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {assessment.summary}
              </p>
            </div>
          )}

          {assessment?.phenomenology && (
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Items of Phenomenology
              </h5>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {assessment.phenomenology}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mental State Examination (MSE) */}
      {assessment?.mse && hasAnyValue(assessment.mse) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Mental State Examination (MSE)
            </h4>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-4">
            {/* Core MSE traits */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MSE_CORE_ORDER.map((key) => {
                const value = assessment.mse?.[key];
                if (!value || typeof value !== "string") return null;
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {MSE_FIELD_LABELS[key]}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Thought */}
            {assessment.mse.thought && hasAnyValue(assessment.mse.thought) && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  7. Thought
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(assessment.mse.thought).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <p key={key} className="text-xs text-foreground">
                        <span className="font-semibold text-muted-foreground">
                          {MSE_THOUGHT_LABELS_DB[key as keyof Thought] || key}:{" "}
                        </span>
                        <span>{value}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cognition */}
            {assessment.mse.cognition && hasAnyValue(assessment.mse.cognition) && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  8. Cognition
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(assessment.mse.cognition).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <p key={key} className="text-xs text-foreground">
                        <span className="font-semibold text-muted-foreground">
                          {MSE_COGNITION_LABELS_DB[key as keyof Cognition] || key}:{" "}
                        </span>
                        <span>{value}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Insight */}
            {assessment.mse.insight && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {MSE_FIELD_LABELS.insight}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.mse.insight}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Physical Examination */}
      {assessment?.physical_exam && hasAnyValue(assessment.physical_exam) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Physical Examination
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            {Object.entries(assessment.physical_exam).map(([key, value]) => {
              if (!value) return null;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {PHYSICAL_EXAM_LABELS[key] || key}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Management Plan, Investigations & Risk */}
      {(assessment?.management_plan ||
        assessment?.investigations ||
        assessment?.risk_assessment ||
        assessment?.prognosis) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Management, Risk &amp; Plan
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {assessment?.management_plan && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs dark:bg-emerald-500/10">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  Management Plan
                </h5>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.management_plan}
                </p>
              </div>
            )}

            {assessment?.investigations && (
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-primary" />
                  Investigations Ordered / Required
                </h5>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.investigations}
                </p>
              </div>
            )}

            {assessment?.risk_assessment && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-2xs dark:bg-amber-500/10">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" />
                  Risk Assessment
                </h5>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.risk_assessment}
                </p>
              </div>
            )}

            {assessment?.prognosis && (
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Prognosis
                </h5>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.prognosis}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasAssessment && !vitals && (
        <p className="text-center text-xs text-muted-foreground italic py-4">
          No detailed clinical notes recorded for this consultation.
        </p>
      )}
    </div>
  );
}
