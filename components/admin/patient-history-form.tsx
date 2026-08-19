"use client";

import { Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";

import { savePatientHistory } from "@/actions/save-patient-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type SystemicEnquiryState = {
  general: string;
  respiratory: string;
  cardiovascular: string;
  abdominal: string;
  genitourinary: string;
  centralNervous: string;
};

type PastMedicalHistoryState = {
  seizureDisorder: string;
  sickleCellDisease: string;
  asthma: string;
  hypertension: string;
  diabetes: string;
  tuberculosis: string;
  headInjury: string;
  roadTrafficAccident: string;
  other: string;
};

type TreatmentHistoryState = {
  orthodoxMedications: string;
  herbalMedications: string;
  allergies: string;
  churchPrayerCamps: string;
  other: string;
};

type FamilyHistoryState = {
  father: string;
  mother: string;
  siblings: string;
  seizureDisorder: string;
  mentalIllness: string;
  suicide: string;
  addiction: string;
  hypertension: string;
  diabetes: string;
  asthma: string;
  sickleCellDisease: string;
};

type PersonalHistoryState = {
  pregnancyAndBirth: string;
  earlyChildhoodAndDevelopment: string;
  education: string;
  occupation: string;
  psychosexualRelationship: string;
  maritalHistory: string;
  socialHistory: string;
  forensicHistory: string;
};

export type HistoryState = {
  presentingComplaints: string;
  historyOfPresentingComplaints: string;
  onDirectQuestion: string;
  systemicEnquiry: SystemicEnquiryState;
  pastPsychiatricHistory: string;
  pastMedicalHistory: PastMedicalHistoryState;
  pastSurgicalHistory: string;
  treatmentHistory: TreatmentHistoryState;
  familyHistory: FamilyHistoryState;
  personalHistory: PersonalHistoryState;
  substanceUseAddictionHistory: string;
  premorbidPersonality: string;
};

export const EMPTY_HISTORY: HistoryState = {
  presentingComplaints: "",
  historyOfPresentingComplaints: "",
  onDirectQuestion: "",
  systemicEnquiry: {
    general: "",
    respiratory: "",
    cardiovascular: "",
    abdominal: "",
    genitourinary: "",
    centralNervous: "",
  },
  pastPsychiatricHistory: "",
  pastMedicalHistory: {
    seizureDisorder: "",
    sickleCellDisease: "",
    asthma: "",
    hypertension: "",
    diabetes: "",
    tuberculosis: "",
    headInjury: "",
    roadTrafficAccident: "",
    other: "",
  },
  pastSurgicalHistory: "",
  treatmentHistory: {
    orthodoxMedications: "",
    herbalMedications: "",
    allergies: "",
    churchPrayerCamps: "",
    other: "",
  },
  familyHistory: {
    father: "",
    mother: "",
    siblings: "",
    seizureDisorder: "",
    mentalIllness: "",
    suicide: "",
    addiction: "",
    hypertension: "",
    diabetes: "",
    asthma: "",
    sickleCellDisease: "",
  },
  personalHistory: {
    pregnancyAndBirth: "",
    earlyChildhoodAndDevelopment: "",
    education: "",
    occupation: "",
    psychosexualRelationship: "",
    maritalHistory: "",
    socialHistory: "",
    forensicHistory: "",
  },
  substanceUseAddictionHistory: "",
  premorbidPersonality: "",
};

const SYSTEMIC_ENQUIRY_LABELS: Record<keyof SystemicEnquiryState, string> = {
  general: "General",
  respiratory: "Respiratory",
  cardiovascular: "Cardiovascular",
  abdominal: "Abdominal",
  genitourinary: "Genitourinary",
  centralNervous: "Central Nervous",
};

const PAST_MEDICAL_HISTORY_LABELS: Record<keyof PastMedicalHistoryState, string> = {
  seizureDisorder: "Seizure Disorder",
  sickleCellDisease: "Sickle Cell Disease",
  asthma: "Asthma",
  hypertension: "Hypertension",
  diabetes: "Diabetes",
  tuberculosis: "Tuberculosis",
  headInjury: "Head Injury",
  roadTrafficAccident: "Road Traffic Accident",
  other: "Other",
};

const TREATMENT_HISTORY_LABELS: Record<keyof TreatmentHistoryState, string> = {
  orthodoxMedications: "Orthodox Medications",
  herbalMedications: "Herbal Medications",
  allergies: "Allergies",
  churchPrayerCamps: "Church/Prayer Camps",
  other: "Other",
};

const FAMILY_HISTORY_LABELS: Record<keyof FamilyHistoryState, string> = {
  father: "Father",
  mother: "Mother",
  siblings: "Siblings",
  seizureDisorder: "Seizure Disorder",
  mentalIllness: "Mental Illness",
  suicide: "Suicide",
  addiction: "Addiction",
  hypertension: "Hypertension",
  diabetes: "Diabetes",
  asthma: "Asthma",
  sickleCellDisease: "Sickle Cell Disease",
};

const PERSONAL_HISTORY_LABELS: Record<keyof PersonalHistoryState, string> = {
  pregnancyAndBirth: "Pregnancy & Birth",
  earlyChildhoodAndDevelopment: "Early Childhood & Development",
  education: "Education",
  occupation: "Occupation",
  psychosexualRelationship: "Psychosexual / Relationship",
  maritalHistory: "Marital History",
  socialHistory: "Social History",
  forensicHistory: "Forensic History",
};

function hasAnyValue(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasAnyValue);
  return false;
}

function ViewField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

function ViewFieldGroup<T extends Record<string, string>>({
  title,
  values,
  labels,
}: {
  title: string;
  values: T;
  labels: Record<keyof T, string>;
}) {
  if (!hasAnyValue(values)) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-1 space-y-2">
        {(Object.keys(values) as (keyof T)[]).map((key) => {
          const value = values[key];
          if (!value.trim()) return null;
          return (
            <p key={String(key)} className="text-sm text-foreground">
              <span className="text-muted-foreground">{labels[key]}: </span>
              <span className="whitespace-pre-wrap">{value}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

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

export function PatientHistoryForm({
  patientId,
  initialHistory,
  initialUpdatedAt,
}: {
  patientId: string;
  initialHistory: HistoryState;
  initialUpdatedAt: string | null;
}) {
  const [savedHistory, setSavedHistory] = useState<HistoryState>(initialHistory);
  const [savedAt, setSavedAt] = useState<string | null>(initialUpdatedAt);
  const [mode, setMode] = useState<"view" | "edit">(hasAnyValue(initialHistory) ? "view" : "edit");
  const [history, setHistory] = useState<HistoryState>(initialHistory);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  function startEdit() {
    setError(null);
    setFieldErrors(null);
    setHistory(savedHistory);
    setMode("edit");
  }

  function cancelEdit() {
    setError(null);
    setFieldErrors(null);
    setHistory(savedHistory);
    setMode("view");
  }

  function setHistoryField<K extends keyof HistoryState>(key: K, value: HistoryState[K]) {
    setHistory((prev) => ({ ...prev, [key]: value }));
  }
  function setSystemicEnquiry<K extends keyof SystemicEnquiryState>(key: K, value: string) {
    setHistory((prev) => ({ ...prev, systemicEnquiry: { ...prev.systemicEnquiry, [key]: value } }));
  }
  function setPastMedicalHistory<K extends keyof PastMedicalHistoryState>(key: K, value: string) {
    setHistory((prev) => ({ ...prev, pastMedicalHistory: { ...prev.pastMedicalHistory, [key]: value } }));
  }
  function setTreatmentHistory<K extends keyof TreatmentHistoryState>(key: K, value: string) {
    setHistory((prev) => ({ ...prev, treatmentHistory: { ...prev.treatmentHistory, [key]: value } }));
  }
  function setFamilyHistory<K extends keyof FamilyHistoryState>(key: K, value: string) {
    setHistory((prev) => ({ ...prev, familyHistory: { ...prev.familyHistory, [key]: value } }));
  }
  function setPersonalHistory<K extends keyof PersonalHistoryState>(key: K, value: string) {
    setHistory((prev) => ({ ...prev, personalHistory: { ...prev.personalHistory, [key]: value } }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
    setPending(true);

    const result = await savePatientHistory({
      patientId,
      history: {
        presentingComplaints: orUndefined(history.presentingComplaints),
        historyOfPresentingComplaints: orUndefined(history.historyOfPresentingComplaints),
        onDirectQuestion: orUndefined(history.onDirectQuestion),
        systemicEnquiry: {
          general: orUndefined(history.systemicEnquiry.general),
          respiratory: orUndefined(history.systemicEnquiry.respiratory),
          cardiovascular: orUndefined(history.systemicEnquiry.cardiovascular),
          abdominal: orUndefined(history.systemicEnquiry.abdominal),
          genitourinary: orUndefined(history.systemicEnquiry.genitourinary),
          centralNervous: orUndefined(history.systemicEnquiry.centralNervous),
        },
        pastPsychiatricHistory: orUndefined(history.pastPsychiatricHistory),
        pastMedicalHistory: {
          seizureDisorder: orUndefined(history.pastMedicalHistory.seizureDisorder),
          sickleCellDisease: orUndefined(history.pastMedicalHistory.sickleCellDisease),
          asthma: orUndefined(history.pastMedicalHistory.asthma),
          hypertension: orUndefined(history.pastMedicalHistory.hypertension),
          diabetes: orUndefined(history.pastMedicalHistory.diabetes),
          tuberculosis: orUndefined(history.pastMedicalHistory.tuberculosis),
          headInjury: orUndefined(history.pastMedicalHistory.headInjury),
          roadTrafficAccident: orUndefined(history.pastMedicalHistory.roadTrafficAccident),
          other: orUndefined(history.pastMedicalHistory.other),
        },
        pastSurgicalHistory: orUndefined(history.pastSurgicalHistory),
        treatmentHistory: {
          orthodoxMedications: orUndefined(history.treatmentHistory.orthodoxMedications),
          herbalMedications: orUndefined(history.treatmentHistory.herbalMedications),
          allergies: orUndefined(history.treatmentHistory.allergies),
          churchPrayerCamps: orUndefined(history.treatmentHistory.churchPrayerCamps),
          other: orUndefined(history.treatmentHistory.other),
        },
        familyHistory: {
          father: orUndefined(history.familyHistory.father),
          mother: orUndefined(history.familyHistory.mother),
          siblings: orUndefined(history.familyHistory.siblings),
          seizureDisorder: orUndefined(history.familyHistory.seizureDisorder),
          mentalIllness: orUndefined(history.familyHistory.mentalIllness),
          suicide: orUndefined(history.familyHistory.suicide),
          addiction: orUndefined(history.familyHistory.addiction),
          hypertension: orUndefined(history.familyHistory.hypertension),
          diabetes: orUndefined(history.familyHistory.diabetes),
          asthma: orUndefined(history.familyHistory.asthma),
          sickleCellDisease: orUndefined(history.familyHistory.sickleCellDisease),
        },
        personalHistory: {
          pregnancyAndBirth: orUndefined(history.personalHistory.pregnancyAndBirth),
          earlyChildhoodAndDevelopment: orUndefined(history.personalHistory.earlyChildhoodAndDevelopment),
          education: orUndefined(history.personalHistory.education),
          occupation: orUndefined(history.personalHistory.occupation),
          psychosexualRelationship: orUndefined(history.personalHistory.psychosexualRelationship),
          maritalHistory: orUndefined(history.personalHistory.maritalHistory),
          socialHistory: orUndefined(history.personalHistory.socialHistory),
          forensicHistory: orUndefined(history.personalHistory.forensicHistory),
        },
        substanceUseAddictionHistory: orUndefined(history.substanceUseAddictionHistory),
        premorbidPersonality: orUndefined(history.premorbidPersonality),
      },
    });
    setPending(false);

    if (result.status !== "success") {
      setError(result.message ?? "Failed to save history.");
      setFieldErrors(result.fieldErrors ?? null);
      return;
    }

    setSavedHistory(history);
    setSavedAt(new Date().toISOString());
    setMode("view");
  }

  if (mode === "view") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>History</CardTitle>
          <div className="flex items-center gap-3">
            {savedAt && <p className="text-xs text-muted-foreground">Saved {formatDateTime(savedAt)}</p>}
            <Button type="button" size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasAnyValue(savedHistory) ? (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          ) : (
            <>
              <ViewField label="1. Presenting Complaint(s)" value={savedHistory.presentingComplaints} />
              <ViewField
                label="2. History of Presenting Complaint(s)"
                value={savedHistory.historyOfPresentingComplaints}
              />
              <ViewField label="3. On Direct Question (ODQ)" value={savedHistory.onDirectQuestion} />
              <ViewFieldGroup
                title="4. Systemic Enquiry"
                values={savedHistory.systemicEnquiry}
                labels={SYSTEMIC_ENQUIRY_LABELS}
              />
              <ViewField label="5. Past Psychiatric History" value={savedHistory.pastPsychiatricHistory} />
              <ViewFieldGroup
                title="6. Past Medical History"
                values={savedHistory.pastMedicalHistory}
                labels={PAST_MEDICAL_HISTORY_LABELS}
              />
              <ViewField label="7. Past Surgical History" value={savedHistory.pastSurgicalHistory} />
              <ViewFieldGroup
                title="8. Treatment History"
                values={savedHistory.treatmentHistory}
                labels={TREATMENT_HISTORY_LABELS}
              />
              <ViewFieldGroup
                title="9. Family History"
                values={savedHistory.familyHistory}
                labels={FAMILY_HISTORY_LABELS}
              />
              <ViewFieldGroup
                title="10. Personal History"
                values={savedHistory.personalHistory}
                labels={PERSONAL_HISTORY_LABELS}
              />
              <ViewField
                label="11. Substance Use / Addiction History"
                value={savedHistory.substanceUseAddictionHistory}
              />
              <ViewField label="12. Premorbid Personality" value={savedHistory.premorbidPersonality} />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TextField
            label="1. Presenting Complaint(s)"
            value={history.presentingComplaints}
            onChange={(v) => setHistoryField("presentingComplaints", v)}
            disabled={pending}
          />
          <TextField
            label="2. History of Presenting Complaint(s)"
            value={history.historyOfPresentingComplaints}
            onChange={(v) => setHistoryField("historyOfPresentingComplaints", v)}
            disabled={pending}
          />
          <TextField
            label="3. On Direct Question (ODQ)"
            value={history.onDirectQuestion}
            onChange={(v) => setHistoryField("onDirectQuestion", v)}
            disabled={pending}
          />

          <div>
            <p className="text-sm font-medium text-foreground">4. Systemic Enquiry</p>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="General"
                value={history.systemicEnquiry.general}
                onChange={(v) => setSystemicEnquiry("general", v)}
                disabled={pending}
              />
              <TextField
                label="Respiratory"
                value={history.systemicEnquiry.respiratory}
                onChange={(v) => setSystemicEnquiry("respiratory", v)}
                disabled={pending}
              />
              <TextField
                label="Cardiovascular"
                value={history.systemicEnquiry.cardiovascular}
                onChange={(v) => setSystemicEnquiry("cardiovascular", v)}
                disabled={pending}
              />
              <TextField
                label="Abdominal"
                value={history.systemicEnquiry.abdominal}
                onChange={(v) => setSystemicEnquiry("abdominal", v)}
                disabled={pending}
              />
              <TextField
                label="Genitourinary"
                value={history.systemicEnquiry.genitourinary}
                onChange={(v) => setSystemicEnquiry("genitourinary", v)}
                disabled={pending}
              />
              <TextField
                label="Central Nervous"
                value={history.systemicEnquiry.centralNervous}
                onChange={(v) => setSystemicEnquiry("centralNervous", v)}
                disabled={pending}
              />
            </div>
          </div>

          <TextField
            label="5. Past Psychiatric History"
            value={history.pastPsychiatricHistory}
            onChange={(v) => setHistoryField("pastPsychiatricHistory", v)}
            disabled={pending}
          />

          <div>
            <p className="text-sm font-medium text-foreground">6. Past Medical History</p>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Seizure Disorder"
                value={history.pastMedicalHistory.seizureDisorder}
                onChange={(v) => setPastMedicalHistory("seizureDisorder", v)}
                disabled={pending}
              />
              <TextField
                label="Sickle Cell Disease"
                value={history.pastMedicalHistory.sickleCellDisease}
                onChange={(v) => setPastMedicalHistory("sickleCellDisease", v)}
                disabled={pending}
              />
              <TextField
                label="Asthma"
                value={history.pastMedicalHistory.asthma}
                onChange={(v) => setPastMedicalHistory("asthma", v)}
                disabled={pending}
              />
              <TextField
                label="Hypertension"
                value={history.pastMedicalHistory.hypertension}
                onChange={(v) => setPastMedicalHistory("hypertension", v)}
                disabled={pending}
              />
              <TextField
                label="Diabetes"
                value={history.pastMedicalHistory.diabetes}
                onChange={(v) => setPastMedicalHistory("diabetes", v)}
                disabled={pending}
              />
              <TextField
                label="Tuberculosis"
                value={history.pastMedicalHistory.tuberculosis}
                onChange={(v) => setPastMedicalHistory("tuberculosis", v)}
                disabled={pending}
              />
              <TextField
                label="Head Injury"
                value={history.pastMedicalHistory.headInjury}
                onChange={(v) => setPastMedicalHistory("headInjury", v)}
                disabled={pending}
              />
              <TextField
                label="Road Traffic Accident"
                value={history.pastMedicalHistory.roadTrafficAccident}
                onChange={(v) => setPastMedicalHistory("roadTrafficAccident", v)}
                disabled={pending}
              />
              <TextField
                label="Other"
                value={history.pastMedicalHistory.other}
                onChange={(v) => setPastMedicalHistory("other", v)}
                disabled={pending}
              />
            </div>
          </div>

          <TextField
            label="7. Past Surgical History"
            value={history.pastSurgicalHistory}
            onChange={(v) => setHistoryField("pastSurgicalHistory", v)}
            disabled={pending}
          />

          <div>
            <p className="text-sm font-medium text-foreground">8. Treatment History</p>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Orthodox Medications"
                value={history.treatmentHistory.orthodoxMedications}
                onChange={(v) => setTreatmentHistory("orthodoxMedications", v)}
                disabled={pending}
              />
              <TextField
                label="Herbal Medications"
                value={history.treatmentHistory.herbalMedications}
                onChange={(v) => setTreatmentHistory("herbalMedications", v)}
                disabled={pending}
              />
              <TextField
                label="Allergies"
                value={history.treatmentHistory.allergies}
                onChange={(v) => setTreatmentHistory("allergies", v)}
                disabled={pending}
              />
              <TextField
                label="Church/Prayer Camps"
                value={history.treatmentHistory.churchPrayerCamps}
                onChange={(v) => setTreatmentHistory("churchPrayerCamps", v)}
                disabled={pending}
              />
              <TextField
                label="Other"
                value={history.treatmentHistory.other}
                onChange={(v) => setTreatmentHistory("other", v)}
                disabled={pending}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">9. Family History</p>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Father"
                value={history.familyHistory.father}
                onChange={(v) => setFamilyHistory("father", v)}
                disabled={pending}
              />
              <TextField
                label="Mother"
                value={history.familyHistory.mother}
                onChange={(v) => setFamilyHistory("mother", v)}
                disabled={pending}
              />
              <TextField
                label="Siblings"
                value={history.familyHistory.siblings}
                onChange={(v) => setFamilyHistory("siblings", v)}
                disabled={pending}
              />
              <TextField
                label="Seizure Disorder"
                value={history.familyHistory.seizureDisorder}
                onChange={(v) => setFamilyHistory("seizureDisorder", v)}
                disabled={pending}
              />
              <TextField
                label="Mental Illness"
                value={history.familyHistory.mentalIllness}
                onChange={(v) => setFamilyHistory("mentalIllness", v)}
                disabled={pending}
              />
              <TextField
                label="Suicide"
                value={history.familyHistory.suicide}
                onChange={(v) => setFamilyHistory("suicide", v)}
                disabled={pending}
              />
              <TextField
                label="Addiction"
                value={history.familyHistory.addiction}
                onChange={(v) => setFamilyHistory("addiction", v)}
                disabled={pending}
              />
              <TextField
                label="Hypertension"
                value={history.familyHistory.hypertension}
                onChange={(v) => setFamilyHistory("hypertension", v)}
                disabled={pending}
              />
              <TextField
                label="Diabetes"
                value={history.familyHistory.diabetes}
                onChange={(v) => setFamilyHistory("diabetes", v)}
                disabled={pending}
              />
              <TextField
                label="Asthma"
                value={history.familyHistory.asthma}
                onChange={(v) => setFamilyHistory("asthma", v)}
                disabled={pending}
              />
              <TextField
                label="Sickle Cell Disease"
                value={history.familyHistory.sickleCellDisease}
                onChange={(v) => setFamilyHistory("sickleCellDisease", v)}
                disabled={pending}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">10. Personal History</p>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Pregnancy & Birth"
                value={history.personalHistory.pregnancyAndBirth}
                onChange={(v) => setPersonalHistory("pregnancyAndBirth", v)}
                disabled={pending}
              />
              <TextField
                label="Early Childhood & Development"
                value={history.personalHistory.earlyChildhoodAndDevelopment}
                onChange={(v) => setPersonalHistory("earlyChildhoodAndDevelopment", v)}
                disabled={pending}
              />
              <TextField
                label="Education"
                value={history.personalHistory.education}
                onChange={(v) => setPersonalHistory("education", v)}
                disabled={pending}
              />
              <TextField
                label="Occupation"
                value={history.personalHistory.occupation}
                onChange={(v) => setPersonalHistory("occupation", v)}
                disabled={pending}
              />
              <TextField
                label="Psychosexual / Relationship"
                value={history.personalHistory.psychosexualRelationship}
                onChange={(v) => setPersonalHistory("psychosexualRelationship", v)}
                disabled={pending}
              />
              <TextField
                label="Marital History"
                value={history.personalHistory.maritalHistory}
                onChange={(v) => setPersonalHistory("maritalHistory", v)}
                disabled={pending}
              />
              <TextField
                label="Social History"
                value={history.personalHistory.socialHistory}
                onChange={(v) => setPersonalHistory("socialHistory", v)}
                disabled={pending}
              />
              <TextField
                label="Forensic History"
                value={history.personalHistory.forensicHistory}
                onChange={(v) => setPersonalHistory("forensicHistory", v)}
                disabled={pending}
              />
            </div>
          </div>

          <TextField
            label="11. Substance Use / Addiction History"
            value={history.substanceUseAddictionHistory}
            onChange={(v) => setHistoryField("substanceUseAddictionHistory", v)}
            disabled={pending}
          />

          <TextField
            label="12. Premorbid Personality"
            value={history.premorbidPersonality}
            onChange={(v) => setHistoryField("premorbidPersonality", v)}
            disabled={pending}
          />
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

      <div className="flex items-center justify-end gap-3">
        {hasAnyValue(savedHistory) && (
          <Button type="button" variant="outline" onClick={cancelEdit} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save history"}
        </Button>
      </div>
    </form>
  );
}
