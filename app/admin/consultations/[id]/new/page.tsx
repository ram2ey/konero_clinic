"use client";

import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Icd11Match } from "@/actions/search-icd11";
import { recordConsultation, type RecordConsultationInput } from "@/actions/record-consultation";
import { Icd11Combobox } from "@/components/admin/icd11-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorInputClass, inputClass, orUndefined, selectClass, textareaClass } from "@/lib/form-ui";
import { MSE_COGNITION_LABELS, MSE_FIELD_LABELS, MSE_THOUGHT_LABELS } from "@/lib/mse-labels";
import { createNestedFieldSetter } from "@/lib/nested-field";

const RECORD_STATUSES = [
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type RecordStatus = (typeof RECORD_STATUSES)[number]["value"];

type DiagnosisRow = {
  condition: string;
  status: RecordStatus;
  icd11Code?: string;
  icd11Uri?: string;
};
type PrescriptionRow = {
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  status: RecordStatus;
};

type ThoughtState = {
  streamFlow: string;
  form: string;
  content: string;
  possession: string;
  control: string;
};

type CognitionState = {
  orientation: string;
  memory: string;
  attention: string;
  concentration: string;
  abstraction: string;
  generalFundOfKnowledge: string;
  judgement: string;
};

type MseState = {
  appearance: string;
  behaviour: string;
  mood: string;
  affect: string;
  perception: string;
  speech: string;
  thought: ThoughtState;
  cognition: CognitionState;
  insight: string;
};

const EMPTY_MSE: MseState = {
  appearance: "",
  behaviour: "",
  mood: "",
  affect: "",
  perception: "",
  speech: "",
  thought: {
    streamFlow: "",
    form: "",
    content: "",
    possession: "",
    control: "",
  },
  cognition: {
    orientation: "",
    memory: "",
    attention: "",
    concentration: "",
    abstraction: "",
    generalFundOfKnowledge: "",
    judgement: "",
  },
  insight: "",
};

type FormState = {
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  temperatureCelsius: string;
  respiratoryRate: string;
  weightKg: string;
  oxygenSaturation: string;
  peGeneral: string;
  peAnthropometric: string;
  peCardiovascular: string;
  peRespiratory: string;
  peGastrointestinal: string;
  peCns: string;
  peMusculoskeletal: string;
  peSkin: string;
  peOther: string;
  summary: string;
  phenomenology: string;
  managementPlan: string;
  investigations: string;
  riskAssessment: string;
  prognosis: string;
  invoiceAmount: string;
  invoiceDescription: string;
};

const EMPTY_FORM: FormState = {
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  temperatureCelsius: "",
  respiratoryRate: "",
  weightKg: "",
  oxygenSaturation: "",
  peGeneral: "",
  peAnthropometric: "",
  peCardiovascular: "",
  peRespiratory: "",
  peGastrointestinal: "",
  peCns: "",
  peMusculoskeletal: "",
  peSkin: "",
  peOther: "",
  summary: "",
  phenomenology: "",
  managementPlan: "",
  investigations: "",
  riskAssessment: "",
  prognosis: "",
  invoiceAmount: "",
  invoiceDescription: "",
};

// Every field below is named after the exact Zod path the server
// returns in fieldErrors (see actions/record-consultation.ts and
// lib/zod-field-errors.ts) — "field-<path>" is that field's DOM id, so
// a submit failure can scroll/focus straight to it, and readable text
// for anything without a matching field falls back to humanizePath().
const SECTION_LABELS: Record<string, string> = {
  assessment: "",
  mse: "MSE",
  thought: "Thought",
  cognition: "Cognition",
  physicalExam: "Physical Exam",
  vitals: "Vitals",
  invoice: "Invoice",
  diagnoses: "Diagnosis",
  prescriptions: "Medication",
};

function humanizeSegment(segment: string): string {
  if (/^\d+$/.test(segment)) return `#${Number(segment) + 1}`;
  if (segment in SECTION_LABELS) return SECTION_LABELS[segment];
  const spaced = segment.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function humanizePath(path: string): string {
  if (path === "_root") return "Form";
  return path.split(".").map(humanizeSegment).filter(Boolean).join(" → ");
}

function fieldId(name: string): string {
  return `field-${name}`;
}

export default function RecordConsultationPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [mse, setMse] = useState<MseState>(EMPTY_MSE);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  function fieldMessage(name: string): string | undefined {
    return fieldErrors?.[name]?.[0];
  }

  // Nested so both close over `pending`/`fieldErrors` instead of needing
  // them re-passed at every one of the ~90 call sites below.
  function TextField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
    const id = fieldId(name);
    const message = fieldMessage(name);
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className={`${textareaClass} mt-1 ${message ? errorInputClass : ""}`}
        />
        {message && (
          <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
            {message}
          </p>
        )}
      </div>
    );
  }

  function InputField({
    name,
    label,
    type = "text",
    step,
    value,
    onChange,
  }: {
    name: string;
    label: string;
    type?: string;
    step?: string;
    value: string;
    onChange: (value: string) => void;
  }) {
    const id = fieldId(name);
    const message = fieldMessage(name);
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <input
          id={id}
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className={`${inputClass} mt-1 ${message ? errorInputClass : ""}`}
        />
        {message && (
          <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
            {message}
          </p>
        )}
      </div>
    );
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMseField<K extends keyof MseState>(key: K, value: MseState[K]) {
    setMse((prev) => ({ ...prev, [key]: value }));
  }
  const setThought = createNestedFieldSetter(setMse, "thought");
  const setCognition = createNestedFieldSetter(setMse, "cognition");

  function addDiagnosis() {
    setDiagnoses((prev) => [...prev, { condition: "", status: "active" }]);
  }
  function updateDiagnosis(index: number, patch: Partial<DiagnosisRow>) {
    setDiagnoses((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeDiagnosis(index: number) {
    setDiagnoses((prev) => prev.filter((_, i) => i !== index));
  }

  function addPrescription() {
    setPrescriptions((prev) => [
      ...prev,
      { medicationName: "", dosage: "", frequency: "", instructions: "", status: "active" },
    ]);
  }
  function updatePrescription(index: number, patch: Partial<PrescriptionRow>) {
    setPrescriptions((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removePrescription(index: number) {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
    setPending(true);

    const hasVitals = [
      form.bloodPressureSystolic,
      form.bloodPressureDiastolic,
      form.heartRate,
      form.temperatureCelsius,
      form.respiratoryRate,
      form.weightKg,
      form.oxygenSaturation,
    ].some((v) => v.trim().length > 0);

    const input: RecordConsultationInput = {
      patientId,
      vitals: hasVitals
        ? {
            bloodPressureSystolic: orUndefined(form.bloodPressureSystolic),
            bloodPressureDiastolic: orUndefined(form.bloodPressureDiastolic),
            heartRate: orUndefined(form.heartRate),
            temperatureCelsius: orUndefined(form.temperatureCelsius),
            respiratoryRate: orUndefined(form.respiratoryRate),
            weightKg: orUndefined(form.weightKg),
            oxygenSaturation: orUndefined(form.oxygenSaturation),
          }
        : undefined,
      assessment: {
        mse: {
          appearance: orUndefined(mse.appearance),
          behaviour: orUndefined(mse.behaviour),
          mood: orUndefined(mse.mood),
          affect: orUndefined(mse.affect),
          perception: orUndefined(mse.perception),
          speech: orUndefined(mse.speech),
          thought: {
            streamFlow: orUndefined(mse.thought.streamFlow),
            form: orUndefined(mse.thought.form),
            content: orUndefined(mse.thought.content),
            possession: orUndefined(mse.thought.possession),
            control: orUndefined(mse.thought.control),
          },
          cognition: {
            orientation: orUndefined(mse.cognition.orientation),
            memory: orUndefined(mse.cognition.memory),
            attention: orUndefined(mse.cognition.attention),
            concentration: orUndefined(mse.cognition.concentration),
            abstraction: orUndefined(mse.cognition.abstraction),
            generalFundOfKnowledge: orUndefined(mse.cognition.generalFundOfKnowledge),
            judgement: orUndefined(mse.cognition.judgement),
          },
          insight: orUndefined(mse.insight),
        },
        physicalExam: {
          general: orUndefined(form.peGeneral),
          anthropometric: orUndefined(form.peAnthropometric),
          cardiovascular: orUndefined(form.peCardiovascular),
          respiratory: orUndefined(form.peRespiratory),
          gastrointestinal: orUndefined(form.peGastrointestinal),
          cns: orUndefined(form.peCns),
          musculoskeletal: orUndefined(form.peMusculoskeletal),
          skin: orUndefined(form.peSkin),
          other: orUndefined(form.peOther),
        },
        summary: orUndefined(form.summary),
        phenomenology: orUndefined(form.phenomenology),
        managementPlan: orUndefined(form.managementPlan),
        investigations: orUndefined(form.investigations),
        riskAssessment: orUndefined(form.riskAssessment),
        prognosis: orUndefined(form.prognosis),
      },
      diagnoses: diagnoses
        .filter((d) => d.condition.trim().length > 0)
        .map((d) => ({
          condition: d.condition,
          status: d.status,
          icd11Code: d.icd11Code,
          icd11Uri: d.icd11Uri,
        })),
      prescriptions: prescriptions
        .filter((p) => p.medicationName.trim().length > 0)
        .map((p) => ({
          medicationName: p.medicationName,
          dosage: p.dosage,
          frequency: p.frequency,
          instructions: orUndefined(p.instructions),
          status: p.status,
        })),
      invoice: orUndefined(form.invoiceAmount)
        ? { amount: form.invoiceAmount, description: orUndefined(form.invoiceDescription) }
        : undefined,
    };

    const result = await recordConsultation(input);
    setPending(false);

    if (result.status !== "success") {
      setError(result.message ?? "Failed to record the consultation.");
      const errors = result.fieldErrors ?? null;
      setFieldErrors(errors);

      const firstKey = errors ? Object.keys(errors)[0] : undefined;
      requestAnimationFrame(() => {
        const target = firstKey ? document.getElementById(fieldId(firstKey)) : null;
        const fallback = document.getElementById("form-error-summary");
        const el = target ?? fallback;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (target) target.focus();
      });
      return;
    }

    router.push(`/admin/consultations/${patientId}?recorded=1`);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Record Consultation</h1>
        <p className="text-sm text-muted-foreground">Everything below is optional except at least a condition or medication if you add one.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vitals (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InputField
              name="vitals.bloodPressureSystolic"
              label="BP systolic"
              type="number"
              value={form.bloodPressureSystolic}
              onChange={(v) => set("bloodPressureSystolic", v)}
            />
            <InputField
              name="vitals.bloodPressureDiastolic"
              label="BP diastolic"
              type="number"
              value={form.bloodPressureDiastolic}
              onChange={(v) => set("bloodPressureDiastolic", v)}
            />
            <InputField
              name="vitals.heartRate"
              label="Heart rate"
              type="number"
              value={form.heartRate}
              onChange={(v) => set("heartRate", v)}
            />
            <InputField
              name="vitals.temperatureCelsius"
              label="Temp (°C)"
              type="number"
              value={form.temperatureCelsius}
              onChange={(v) => set("temperatureCelsius", v)}
            />
            <InputField
              name="vitals.respiratoryRate"
              label="Respiratory rate"
              type="number"
              value={form.respiratoryRate}
              onChange={(v) => set("respiratoryRate", v)}
            />
            <InputField
              name="vitals.weightKg"
              label="Weight (kg)"
              type="number"
              value={form.weightKg}
              onChange={(v) => set("weightKg", v)}
            />
            <InputField
              name="vitals.oxygenSaturation"
              label="O2 saturation (%)"
              type="number"
              value={form.oxygenSaturation}
              onChange={(v) => set("oxygenSaturation", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mental State Examination (MSE)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TextField name="assessment.mse.appearance" label={MSE_FIELD_LABELS.appearance} value={mse.appearance} onChange={(v) => setMseField("appearance", v)} />
            <TextField name="assessment.mse.behaviour" label={MSE_FIELD_LABELS.behaviour} value={mse.behaviour} onChange={(v) => setMseField("behaviour", v)} />
            <TextField name="assessment.mse.mood" label={MSE_FIELD_LABELS.mood} value={mse.mood} onChange={(v) => setMseField("mood", v)} />
            <TextField name="assessment.mse.affect" label={MSE_FIELD_LABELS.affect} value={mse.affect} onChange={(v) => setMseField("affect", v)} />
            <TextField name="assessment.mse.perception" label={MSE_FIELD_LABELS.perception} value={mse.perception} onChange={(v) => setMseField("perception", v)} />
            <TextField name="assessment.mse.speech" label={MSE_FIELD_LABELS.speech} value={mse.speech} onChange={(v) => setMseField("speech", v)} />

            <div>
              <p className="text-sm font-medium text-foreground">7. Thought</p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  name="assessment.mse.thought.streamFlow"
                  label={MSE_THOUGHT_LABELS.streamFlow}
                  value={mse.thought.streamFlow}
                  onChange={(v) => setThought("streamFlow", v)}
                />
                <TextField
                  name="assessment.mse.thought.form"
                  label={MSE_THOUGHT_LABELS.form}
                  value={mse.thought.form}
                  onChange={(v) => setThought("form", v)}
                />
                <TextField
                  name="assessment.mse.thought.content"
                  label={MSE_THOUGHT_LABELS.content}
                  value={mse.thought.content}
                  onChange={(v) => setThought("content", v)}
                />
                <TextField
                  name="assessment.mse.thought.possession"
                  label={MSE_THOUGHT_LABELS.possession}
                  value={mse.thought.possession}
                  onChange={(v) => setThought("possession", v)}
                />
                <TextField
                  name="assessment.mse.thought.control"
                  label={MSE_THOUGHT_LABELS.control}
                  value={mse.thought.control}
                  onChange={(v) => setThought("control", v)}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">8. Cognition</p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  name="assessment.mse.cognition.orientation"
                  label={MSE_COGNITION_LABELS.orientation}
                  value={mse.cognition.orientation}
                  onChange={(v) => setCognition("orientation", v)}
                />
                <TextField
                  name="assessment.mse.cognition.memory"
                  label={MSE_COGNITION_LABELS.memory}
                  value={mse.cognition.memory}
                  onChange={(v) => setCognition("memory", v)}
                />
                <TextField
                  name="assessment.mse.cognition.attention"
                  label={MSE_COGNITION_LABELS.attention}
                  value={mse.cognition.attention}
                  onChange={(v) => setCognition("attention", v)}
                />
                <TextField
                  name="assessment.mse.cognition.concentration"
                  label={MSE_COGNITION_LABELS.concentration}
                  value={mse.cognition.concentration}
                  onChange={(v) => setCognition("concentration", v)}
                />
                <TextField
                  name="assessment.mse.cognition.abstraction"
                  label={MSE_COGNITION_LABELS.abstraction}
                  value={mse.cognition.abstraction}
                  onChange={(v) => setCognition("abstraction", v)}
                />
                <TextField
                  name="assessment.mse.cognition.generalFundOfKnowledge"
                  label={MSE_COGNITION_LABELS.generalFundOfKnowledge}
                  value={mse.cognition.generalFundOfKnowledge}
                  onChange={(v) => setCognition("generalFundOfKnowledge", v)}
                />
                <TextField
                  name="assessment.mse.cognition.judgement"
                  label={MSE_COGNITION_LABELS.judgement}
                  value={mse.cognition.judgement}
                  onChange={(v) => setCognition("judgement", v)}
                />
              </div>
            </div>

            <TextField name="assessment.mse.insight" label={MSE_FIELD_LABELS.insight} value={mse.insight} onChange={(v) => setMseField("insight", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Physical Examination</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="assessment.physicalExam.general" label="General" value={form.peGeneral} onChange={(v) => set("peGeneral", v)} />
            <TextField
              name="assessment.physicalExam.anthropometric"
              label="Anthropometric"
              value={form.peAnthropometric}
              onChange={(v) => set("peAnthropometric", v)}
            />
            <TextField
              name="assessment.physicalExam.cardiovascular"
              label="Cardiovascular"
              value={form.peCardiovascular}
              onChange={(v) => set("peCardiovascular", v)}
            />
            <TextField
              name="assessment.physicalExam.respiratory"
              label="Respiratory"
              value={form.peRespiratory}
              onChange={(v) => set("peRespiratory", v)}
            />
            <TextField
              name="assessment.physicalExam.gastrointestinal"
              label="Gastrointestinal"
              value={form.peGastrointestinal}
              onChange={(v) => set("peGastrointestinal", v)}
            />
            <TextField name="assessment.physicalExam.cns" label="CNS" value={form.peCns} onChange={(v) => set("peCns", v)} />
            <TextField
              name="assessment.physicalExam.musculoskeletal"
              label="Musculoskeletal"
              value={form.peMusculoskeletal}
              onChange={(v) => set("peMusculoskeletal", v)}
            />
            <TextField name="assessment.physicalExam.skin" label="Skin" value={form.peSkin} onChange={(v) => set("peSkin", v)} />
            <TextField name="assessment.physicalExam.other" label="Other" value={form.peOther} onChange={(v) => set("peOther", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField name="assessment.summary" label="Summary" value={form.summary} onChange={(v) => set("summary", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField
              name="assessment.phenomenology"
              label="Items of Phenomenology"
              value={form.phenomenology}
              onChange={(v) => set("phenomenology", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Diagnosis / Differential Diagnosis</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addDiagnosis} disabled={pending}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnoses.length === 0 && <p className="text-sm text-muted-foreground">None added.</p>}
            {diagnoses.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Icd11Combobox
                    ariaLabel="Diagnosis"
                    value={row.condition}
                    onTextChange={(v) => updateDiagnosis(i, { condition: v, icd11Code: undefined, icd11Uri: undefined })}
                    onSelect={(match: Icd11Match) =>
                      updateDiagnosis(i, {
                        condition: match.title,
                        icd11Code: match.code ?? undefined,
                        icd11Uri: match.uri,
                      })
                    }
                    disabled={pending}
                  />
                  {row.icd11Code && (
                    <span className="mt-2 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {row.icd11Code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Status"
                    value={row.status}
                    onChange={(e) => updateDiagnosis(i, { status: e.target.value as RecordStatus })}
                    disabled={pending}
                    className={selectClass}
                  >
                    {RECORD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDiagnosis(i)} disabled={pending} aria-label="Remove diagnosis">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField name="assessment.managementPlan" label="Management Plan" value={form.managementPlan} onChange={(v) => set("managementPlan", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField name="assessment.investigations" label="Investigations" value={form.investigations} onChange={(v) => set("investigations", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Medications</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addPrescription} disabled={pending}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.length === 0 && <p className="text-sm text-muted-foreground">None added.</p>}
            {prescriptions.map((row, i) => (
              <div key={i} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    aria-label="Medication name"
                    placeholder="Medication name"
                    value={row.medicationName}
                    onChange={(e) => updatePrescription(i, { medicationName: e.target.value })}
                    disabled={pending}
                    className={`${inputClass} min-w-0 flex-1`}
                  />
                  <select
                    aria-label="Status"
                    value={row.status}
                    onChange={(e) => updatePrescription(i, { status: e.target.value as RecordStatus })}
                    disabled={pending}
                    className={selectClass}
                  >
                    {RECORD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrescription(i)}
                    disabled={pending}
                    aria-label="Remove medication"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    aria-label="Dosage"
                    placeholder="Dosage"
                    value={row.dosage}
                    onChange={(e) => updatePrescription(i, { dosage: e.target.value })}
                    disabled={pending}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    aria-label="Frequency"
                    placeholder="Frequency"
                    value={row.frequency}
                    onChange={(e) => updatePrescription(i, { frequency: e.target.value })}
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
                <input
                  type="text"
                  aria-label="Instructions"
                  placeholder="Instructions (optional)"
                  value={row.instructions}
                  onChange={(e) => updatePrescription(i, { instructions: e.target.value })}
                  disabled={pending}
                  className={inputClass}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField name="assessment.riskAssessment" label="Risk Assessment" value={form.riskAssessment} onChange={(v) => set("riskAssessment", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField name="assessment.prognosis" label="Prognosis" value={form.prognosis} onChange={(v) => set("prognosis", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              name="invoice.amount"
              label="Amount"
              type="number"
              step="0.01"
              value={form.invoiceAmount}
              onChange={(v) => set("invoiceAmount", v)}
            />
            <InputField
              name="invoice.description"
              label="Description"
              value={form.invoiceDescription}
              onChange={(v) => set("invoiceDescription", v)}
            />
          </CardContent>
        </Card>

        {error && (
          <div id="form-error-summary" role="alert" tabIndex={-1} className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
            {fieldErrors && (
              <ul className="list-inside list-disc text-xs text-destructive">
                {Object.entries(fieldErrors).map(([field, messages]) => (
                  <li key={field}>
                    {humanizePath(field)}: {messages.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save consultation"}
          </Button>
        </div>
      </form>
    </main>
  );
}
