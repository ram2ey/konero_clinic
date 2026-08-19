import { ChevronDown, ClipboardList } from "lucide-react";

import { VisitTypeBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { MSE_COGNITION_LABELS_DB, MSE_FIELD_LABELS, MSE_THOUGHT_LABELS_DB } from "@/lib/mse-labels";
import { createClient } from "@/lib/supabase/server";
import { hasAnyValue } from "@/lib/utils";

type Vitals = {
  blood_pressure?: { systolic: number | null; diastolic: number | null } | null;
  heart_rate_bpm?: number | null;
  temperature_celsius?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  oxygen_saturation_percent?: number | null;
} | null;

type PhysicalExam = Record<
  "general" | "anthropometric" | "cardiovascular" | "respiratory" | "gastrointestinal" | "cns" | "musculoskeletal" | "skin" | "other",
  string | null
> | null;

type Thought = Record<"stream_flow" | "form" | "content" | "possession" | "control", string | null> | null;

type Cognition = Record<
  "orientation" | "memory" | "attention" | "concentration" | "abstraction" | "general_fund_of_knowledge" | "judgement",
  string | null
> | null;

type Mse = {
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

type Assessment = {
  mse?: Mse;
  physical_exam?: PhysicalExam;
  summary?: string | null;
  phenomenology?: string | null;
  management_plan?: string | null;
  investigations?: string | null;
  risk_assessment?: string | null;
  prognosis?: string | null;
} | null;

type Consultation = {
  id: string;
  created_at: string;
  vitals: Vitals;
  assessment: Assessment;
  visit_type: "first_visit" | "review";
};

const PHYSICAL_EXAM_LABELS: Record<string, string> = {
  general: "General",
  anthropometric: "Anthropometric",
  cardiovascular: "Cardiovascular",
  respiratory: "Respiratory",
  gastrointestinal: "Gastrointestinal",
  cns: "CNS",
  musculoskeletal: "Musculoskeletal",
  skin: "Skin",
  other: "Other",
};

const ASSESSMENT_LABELS: [keyof NonNullable<Assessment>, string][] = [
  ["summary", "Summary"],
  ["phenomenology", "Items of Phenomenology"],
  ["management_plan", "Management Plan"],
  ["investigations", "Investigations"],
  ["risk_assessment", "Risk Assessment"],
  ["prognosis", "Prognosis"],
];

// Display order only — the label text itself lives in lib/mse-labels.ts,
// shared with the recording form.
const MSE_DISPLAY_ORDER = ["appearance", "behaviour", "mood", "affect", "perception", "speech"] as const;

function FieldGroup({ title, values, labels }: { title: string; values: Record<string, string | null> | null | undefined; labels: Record<string, string> }) {
  if (!hasAnyValue(values)) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-1 space-y-2">
        {Object.entries(values!).map(([key, value]) => {
          if (!value) return null;
          return (
            <p key={key} className="text-sm text-foreground">
              <span className="text-muted-foreground">{labels[key]}: </span>
              {value}
            </p>
          );
        })}
      </div>
    </div>
  );
}

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

export async function PreviousConsultations({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: consultations } = await supabase
    .from("consultations")
    .select("id, created_at, vitals, assessment, visit_type")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<Consultation[]>();

  const items = consultations ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <ClipboardList className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No consultations recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const vSummary = vitalsSummary(item.vitals);
        const hasAssessment = hasAnyValue(item.assessment);

        return (
          <Card key={item.id} className="gap-0 overflow-hidden py-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{formatDateTime(item.created_at)}</p>
                    <VisitTypeBadge visitType={item.visit_type} />
                  </div>
                  {vSummary && <p className="mt-0.5 text-xs text-muted-foreground">{vSummary}</p>}
                </div>
                <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>

              <div className="space-y-3 border-t border-border px-4 pt-3 pb-4">
                {!hasAssessment && (
                  <p className="text-sm text-muted-foreground">No assessment notes recorded for this consultation.</p>
                )}
                {item.assessment?.mse && hasAnyValue(item.assessment.mse) && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">MSE</p>
                    <div className="mt-1 space-y-3">
                      {MSE_DISPLAY_ORDER.map((key) => {
                        const value = item.assessment!.mse![key];
                        if (!value || typeof value !== "string") return null;
                        return (
                          <p key={key} className="text-sm text-foreground">
                            <span className="text-muted-foreground">{MSE_FIELD_LABELS[key]}: </span>
                            <span className="whitespace-pre-wrap">{value}</span>
                          </p>
                        );
                      })}
                      <FieldGroup title="7. Thought" values={item.assessment.mse.thought} labels={MSE_THOUGHT_LABELS_DB} />
                      <FieldGroup title="8. Cognition" values={item.assessment.mse.cognition} labels={MSE_COGNITION_LABELS_DB} />
                      {item.assessment.mse.insight && (
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground">{MSE_FIELD_LABELS.insight}: </span>
                          <span className="whitespace-pre-wrap">{item.assessment.mse.insight}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {ASSESSMENT_LABELS.map(([key, label]) => {
                  const value = item.assessment?.[key];
                  if (!value || typeof value !== "string") return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value}</p>
                    </div>
                  );
                })}

                <FieldGroup title="Physical Examination" values={item.assessment?.physical_exam} labels={PHYSICAL_EXAM_LABELS} />
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

export function PreviousConsultationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="gap-0 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}
