"use client";

import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Icd11Match } from "@/actions/search-icd11";
import { recordConsultation, type RecordConsultationInput } from "@/actions/record-consultation";
import { Icd11Combobox } from "@/components/admin/icd11-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
const textareaClass = `${inputClass} min-h-24`;

function orUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${textareaClass} mt-1`}
      />
    </div>
  );
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMseField<K extends keyof MseState>(key: K, value: MseState[K]) {
    setMse((prev) => ({ ...prev, [key]: value }));
  }
  function setThought<K extends keyof ThoughtState>(key: K, value: string) {
    setMse((prev) => ({ ...prev, thought: { ...prev.thought, [key]: value } }));
  }
  function setCognition<K extends keyof CognitionState>(key: K, value: string) {
    setMse((prev) => ({ ...prev, cognition: { ...prev.cognition, [key]: value } }));
  }

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
      setFieldErrors(result.fieldErrors ?? null);
      return;
    }

    router.push(`/admin/consultations/${patientId}`);
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
            <div>
              <label className="block text-sm font-medium text-foreground">BP systolic</label>
              <input
                type="number"
                value={form.bloodPressureSystolic}
                onChange={(e) => set("bloodPressureSystolic", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">BP diastolic</label>
              <input
                type="number"
                value={form.bloodPressureDiastolic}
                onChange={(e) => set("bloodPressureDiastolic", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Heart rate</label>
              <input
                type="number"
                value={form.heartRate}
                onChange={(e) => set("heartRate", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Temp (°C)</label>
              <input
                type="number"
                value={form.temperatureCelsius}
                onChange={(e) => set("temperatureCelsius", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Respiratory rate</label>
              <input
                type="number"
                value={form.respiratoryRate}
                onChange={(e) => set("respiratoryRate", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Weight (kg)</label>
              <input
                type="number"
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">O2 saturation (%)</label>
              <input
                type="number"
                value={form.oxygenSaturation}
                onChange={(e) => set("oxygenSaturation", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mental State Examination (MSE)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TextField
              label="1. Appearance"
              value={mse.appearance}
              onChange={(v) => setMseField("appearance", v)}
              disabled={pending}
            />
            <TextField
              label="2. Behaviour"
              value={mse.behaviour}
              onChange={(v) => setMseField("behaviour", v)}
              disabled={pending}
            />
            <TextField label="3. Mood" value={mse.mood} onChange={(v) => setMseField("mood", v)} disabled={pending} />
            <TextField
              label="4. Affect"
              value={mse.affect}
              onChange={(v) => setMseField("affect", v)}
              disabled={pending}
            />
            <TextField
              label="5. Perception"
              value={mse.perception}
              onChange={(v) => setMseField("perception", v)}
              disabled={pending}
            />
            <TextField
              label="6. Speech"
              value={mse.speech}
              onChange={(v) => setMseField("speech", v)}
              disabled={pending}
            />

            <div>
              <p className="text-sm font-medium text-foreground">7. Thought</p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Stream / Flow"
                  value={mse.thought.streamFlow}
                  onChange={(v) => setThought("streamFlow", v)}
                  disabled={pending}
                />
                <TextField
                  label="Form"
                  value={mse.thought.form}
                  onChange={(v) => setThought("form", v)}
                  disabled={pending}
                />
                <TextField
                  label="Content"
                  value={mse.thought.content}
                  onChange={(v) => setThought("content", v)}
                  disabled={pending}
                />
                <TextField
                  label="Possession"
                  value={mse.thought.possession}
                  onChange={(v) => setThought("possession", v)}
                  disabled={pending}
                />
                <TextField
                  label="Control"
                  value={mse.thought.control}
                  onChange={(v) => setThought("control", v)}
                  disabled={pending}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">8. Cognition</p>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Orientation"
                  value={mse.cognition.orientation}
                  onChange={(v) => setCognition("orientation", v)}
                  disabled={pending}
                />
                <TextField
                  label="Memory"
                  value={mse.cognition.memory}
                  onChange={(v) => setCognition("memory", v)}
                  disabled={pending}
                />
                <TextField
                  label="Attention"
                  value={mse.cognition.attention}
                  onChange={(v) => setCognition("attention", v)}
                  disabled={pending}
                />
                <TextField
                  label="Concentration"
                  value={mse.cognition.concentration}
                  onChange={(v) => setCognition("concentration", v)}
                  disabled={pending}
                />
                <TextField
                  label="Abstraction"
                  value={mse.cognition.abstraction}
                  onChange={(v) => setCognition("abstraction", v)}
                  disabled={pending}
                />
                <TextField
                  label="General Fund of Knowledge"
                  value={mse.cognition.generalFundOfKnowledge}
                  onChange={(v) => setCognition("generalFundOfKnowledge", v)}
                  disabled={pending}
                />
                <TextField
                  label="Judgement"
                  value={mse.cognition.judgement}
                  onChange={(v) => setCognition("judgement", v)}
                  disabled={pending}
                />
              </div>
            </div>

            <TextField
              label="9. Insight"
              value={mse.insight}
              onChange={(v) => setMseField("insight", v)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Physical Examination</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="General" value={form.peGeneral} onChange={(v) => set("peGeneral", v)} disabled={pending} />
            <TextField
              label="Anthropometric"
              value={form.peAnthropometric}
              onChange={(v) => set("peAnthropometric", v)}
              disabled={pending}
            />
            <TextField
              label="Cardiovascular"
              value={form.peCardiovascular}
              onChange={(v) => set("peCardiovascular", v)}
              disabled={pending}
            />
            <TextField
              label="Respiratory"
              value={form.peRespiratory}
              onChange={(v) => set("peRespiratory", v)}
              disabled={pending}
            />
            <TextField
              label="Gastrointestinal"
              value={form.peGastrointestinal}
              onChange={(v) => set("peGastrointestinal", v)}
              disabled={pending}
            />
            <TextField label="CNS" value={form.peCns} onChange={(v) => set("peCns", v)} disabled={pending} />
            <TextField
              label="Musculoskeletal"
              value={form.peMusculoskeletal}
              onChange={(v) => set("peMusculoskeletal", v)}
              disabled={pending}
            />
            <TextField label="Skin" value={form.peSkin} onChange={(v) => set("peSkin", v)} disabled={pending} />
            <TextField label="Other" value={form.peOther} onChange={(v) => set("peOther", v)} disabled={pending} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField label="Summary" value={form.summary} onChange={(v) => set("summary", v)} disabled={pending} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField
              label="Items of Phenomenology"
              value={form.phenomenology}
              onChange={(v) => set("phenomenology", v)}
              disabled={pending}
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
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-1 items-start gap-2">
                  <Icd11Combobox
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
                <select
                  value={row.status}
                  onChange={(e) => updateDiagnosis(i, { status: e.target.value as RecordStatus })}
                  disabled={pending}
                  className={inputClass}
                >
                  {RECORD_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDiagnosis(i)} disabled={pending}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField
              label="Management Plan"
              value={form.managementPlan}
              onChange={(v) => set("managementPlan", v)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField
              label="Investigations"
              value={form.investigations}
              onChange={(v) => set("investigations", v)}
              disabled={pending}
            />
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
                    placeholder="Medication name"
                    value={row.medicationName}
                    onChange={(e) => updatePrescription(i, { medicationName: e.target.value })}
                    disabled={pending}
                    className={`${inputClass} flex-1`}
                  />
                  <select
                    value={row.status}
                    onChange={(e) => updatePrescription(i, { status: e.target.value as RecordStatus })}
                    disabled={pending}
                    className={inputClass}
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
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={row.dosage}
                    onChange={(e) => updatePrescription(i, { dosage: e.target.value })}
                    disabled={pending}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    value={row.frequency}
                    onChange={(e) => updatePrescription(i, { frequency: e.target.value })}
                    disabled={pending}
                    className={inputClass}
                  />
                </div>
                <input
                  type="text"
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
            <TextField
              label="Risk Assessment"
              value={form.riskAssessment}
              onChange={(v) => set("riskAssessment", v)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <TextField
              label="Prognosis"
              value={form.prognosis}
              onChange={(v) => set("prognosis", v)}
              disabled={pending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.invoiceAmount}
                onChange={(e) => set("invoiceAmount", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Description</label>
              <input
                type="text"
                value={form.invoiceDescription}
                onChange={(e) => set("invoiceDescription", e.target.value)}
                disabled={pending}
                className={`${inputClass} mt-1`}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
            {fieldErrors && (
              <ul className="list-inside list-disc text-xs text-destructive">
                {Object.entries(fieldErrors).map(([field, messages]) => (
                  <li key={field}>
                    {field}: {messages.join(", ")}
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
