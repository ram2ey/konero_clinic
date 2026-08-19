import {
  Activity,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Lightbulb,
  Pill,
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

export type DiagnosisRecord = {
  id?: string;
  condition: string;
  status: string;
  icd11_code?: string | null;
  icd11_uri?: string | null;
};

export type PrescriptionRecord = {
  id?: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  status: string;
};

export type ConsultationDetail = {
  id: string;
  created_at: string;
  vitals: Vitals;
  assessment: Assessment;
  visit_type: "first_visit" | "review";
  diagnoses?: DiagnosisRecord[];
  prescriptions?: PrescriptionRecord[];
};

const PHYSICAL_EXAM_SYSTEMS: Array<{ key: keyof NonNullable<PhysicalExam>; label: string }> = [
  { key: "general", label: "General Examination" },
  { key: "anthropometric", label: "Anthropometric Assessment" },
  { key: "cardiovascular", label: "Cardiovascular System (CVS)" },
  { key: "respiratory", label: "Respiratory System" },
  { key: "gastrointestinal", label: "Gastrointestinal System (GIT)" },
  { key: "cns", label: "Central Nervous System (CNS)" },
  { key: "musculoskeletal", label: "Musculoskeletal System" },
  { key: "skin", label: "Skin & Integumentary" },
  { key: "other", label: "Other Systemic Findings" },
];

const MSE_CORE_TRAITS = [
  "appearance",
  "behaviour",
  "speech",
  "mood",
  "affect",
  "perception",
] as const;

const THOUGHT_KEYS: Array<keyof NonNullable<Thought>> = [
  "stream_flow",
  "form",
  "content",
  "possession",
  "control",
];

const COGNITION_KEYS: Array<keyof NonNullable<Cognition>> = [
  "orientation",
  "memory",
  "attention",
  "concentration",
  "abstraction",
  "general_fund_of_knowledge",
  "judgement",
];

function NotRecorded({ text = "Not recorded" }: { text?: string }) {
  return <span className="text-xs text-muted-foreground/60 italic font-normal">{text}</span>;
}

export function ConsultationDetailView({
  consultation,
}: {
  consultation: ConsultationDetail;
}) {
  const { created_at, vitals, assessment, visit_type, diagnoses, prescriptions } = consultation;

  const hasBp = vitals?.blood_pressure?.systolic && vitals?.blood_pressure?.diastolic;

  return (
    <div className="space-y-6 text-sm text-foreground">
      {/* Consultation Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Visit Date &amp; Time
          </p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {formatDateTime(created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VisitTypeBadge visitType={visit_type} />
        </div>
      </div>

      {/* 1. Vital Signs (All 6 displayed) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Vital Signs
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
          {/* BP */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Blood Pressure
            </span>
            <div className="mt-1">
              {hasBp ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals!.blood_pressure!.systolic}/{vitals!.blood_pressure!.diastolic}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">mmHg</span>
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>

          {/* Heart Rate */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Heart Rate
            </span>
            <div className="mt-1">
              {vitals?.heart_rate_bpm ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals.heart_rate_bpm}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">bpm</span>
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>

          {/* Temp */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Temperature
            </span>
            <div className="mt-1">
              {vitals?.temperature_celsius ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals.temperature_celsius}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">°C</span>
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>

          {/* Resp Rate */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Resp. Rate
            </span>
            <div className="mt-1">
              {vitals?.respiratory_rate ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals.respiratory_rate}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">cpm</span>
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>

          {/* SpO2 */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Oxygen (SpO2)
            </span>
            <div className="mt-1">
              {vitals?.oxygen_saturation_percent ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals.oxygen_saturation_percent}%
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>

          {/* Weight */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Weight
            </span>
            <div className="mt-1">
              {vitals?.weight_kg ? (
                <p className="font-mono text-xs font-bold text-foreground">
                  {vitals.weight_kg}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">kg</span>
                </p>
              ) : (
                <NotRecorded text="—" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clinical Formulation & Summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Clinical Formulation &amp; Assessment
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Clinical Summary
            </h5>
            {assessment?.summary ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.summary}
              </p>
            ) : (
              <NotRecorded text="No clinical summary recorded for this visit" />
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Items of Phenomenology
            </h5>
            {assessment?.phenomenology ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.phenomenology}
              </p>
            ) : (
              <NotRecorded text="No items of phenomenology recorded for this visit" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Mental State Examination (MSE) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Mental State Examination (MSE)
          </h4>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-4">
          {/* Core MSE Parameters (1-6) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MSE_CORE_TRAITS.map((key) => {
              const value = assessment?.mse?.[key];
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {MSE_FIELD_LABELS[key]}
                  </p>
                  <div className="mt-1 leading-relaxed">
                    {value ? (
                      <p className="whitespace-pre-wrap text-xs text-foreground">{value}</p>
                    ) : (
                      <NotRecorded />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7. Thought Breakdown */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              7. Thought
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {THOUGHT_KEYS.map((subKey) => {
                const subVal = assessment?.mse?.thought?.[subKey];
                return (
                  <div key={subKey} className="rounded-md border border-border/50 bg-card/70 p-2.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      {MSE_THOUGHT_LABELS_DB[subKey] || subKey}
                    </p>
                    <div className="mt-0.5">
                      {subVal ? (
                        <p className="text-xs text-foreground leading-relaxed">{subVal}</p>
                      ) : (
                        <NotRecorded />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. Cognition Breakdown */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              8. Cognition
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {COGNITION_KEYS.map((subKey) => {
                const subVal = assessment?.mse?.cognition?.[subKey];
                return (
                  <div key={subKey} className="rounded-md border border-border/50 bg-card/70 p-2.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      {MSE_COGNITION_LABELS_DB[subKey] || subKey}
                    </p>
                    <div className="mt-0.5">
                      {subVal ? (
                        <p className="text-xs text-foreground leading-relaxed">{subVal}</p>
                      ) : (
                        <NotRecorded />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 9. Insight */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              9. {MSE_FIELD_LABELS.insight}
            </p>
            <div className="mt-1 leading-relaxed">
              {assessment?.mse?.insight ? (
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {assessment.mse.insight}
                </p>
              ) : (
                <NotRecorded />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Physical Examination (All 9 systems) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Physical Examination
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          {PHYSICAL_EXAM_SYSTEMS.map(({ key, label }) => {
            const val = assessment?.physical_exam?.[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <div className="mt-1">
                  {val ? (
                    <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                      {val}
                    </p>
                  ) : (
                    <NotRecorded text="NAD / Not recorded" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Management, Investigations, Risk & Prognosis */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Management &amp; Action Plan
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Management Plan */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs dark:bg-emerald-500/10">
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Management Plan
            </h5>
            {assessment?.management_plan ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.management_plan}
              </p>
            ) : (
              <NotRecorded text="No management plan recorded" />
            )}
          </div>

          {/* Investigations */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="size-3.5 text-primary" />
              Investigations Ordered
            </h5>
            {assessment?.investigations ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.investigations}
              </p>
            ) : (
              <NotRecorded text="No investigations requested" />
            )}
          </div>

          {/* Risk Assessment */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-2xs dark:bg-amber-500/10">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" />
              Risk Assessment
            </h5>
            {assessment?.risk_assessment ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.risk_assessment}
              </p>
            ) : (
              <NotRecorded text="No risk factors documented" />
            )}
          </div>

          {/* Prognosis */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="size-3.5 text-primary" />
              Prognosis
            </h5>
            {assessment?.prognosis ? (
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {assessment.prognosis}
              </p>
            ) : (
              <NotRecorded text="No prognosis stated" />
            )}
          </div>
        </div>
      </div>

      {/* 6. Linked Diagnoses & Prescriptions for this Consultation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Diagnoses &amp; Prescriptions Recorded During Visit
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Diagnoses */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diagnoses
            </h5>
            {diagnoses && diagnoses.length > 0 ? (
              <div className="space-y-1.5">
                {diagnoses.map((diag, idx) => (
                  <div
                    key={diag.id ?? idx}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{diag.condition}</p>
                      {diag.icd11_code && (
                        <p className="text-[10px] font-mono text-primary">
                          ICD-11: {diag.icd11_code}
                        </p>
                      )}
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {diag.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <NotRecorded text="No diagnoses recorded in this consultation" />
            )}
          </div>

          {/* Prescriptions */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Prescriptions
            </h5>
            {prescriptions && prescriptions.length > 0 ? (
              <div className="space-y-1.5">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={rx.id ?? idx}
                    className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{rx.medication_name}</p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {[rx.dosage, rx.frequency, rx.instructions].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <NotRecorded text="No medications prescribed in this consultation" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
