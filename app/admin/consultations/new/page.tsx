"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { registerPatient, type RegisterPatientResult } from "@/actions/register-patient";
import { TempPasswordPanel } from "@/components/admin/temp-password-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialActionState } from "@/lib/action-state";
import { inputClass } from "@/lib/form-ui";

const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
];

const GENDER_IDENTITIES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "other", label: "Other" },
];

const INFORMANT_RELIABILITIES = [
  { value: "reliable", label: "Reliable" },
  { value: "partially_reliable", label: "Partially reliable" },
  { value: "unreliable", label: "Unreliable" },
];

// Fields that live behind the "Add more details" disclosure — if a submit
// comes back with an error on any of these, the disclosure needs to open
// automatically or the error would be invisible.
const MORE_DETAILS_FIELD_IDS = [
  "occupation",
  "educationLevel",
  "religion",
  "ethnicity",
  "nationality",
  "residence",
  "nextOfKinName",
  "nextOfKinRelationship",
  "nextOfKinContact",
  "informantName",
  "informantRelationship",
  "informantReliability",
  "referralSource",
  "referralReason",
];

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewPatientPage() {
  const [state, formAction, pending] = useActionState<RegisterPatientResult, FormData>(
    registerPatient,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // A validation error on a field behind the disclosure must not be
  // silently hidden — open it automatically the moment one shows up.
  useEffect(() => {
    if (Object.keys(errors).some((key) => MORE_DETAILS_FIELD_IDS.includes(key))) {
      setShowMoreDetails(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "success") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <p className="text-lg font-medium text-foreground">{state.message}</p>
            {state.tempPassword && (
              <TempPasswordPanel email={state.email} tempPassword={state.tempPassword} />
            )}
            <div className="flex gap-3 pt-2">
              <Button asChild variant="outline">
                <Link href="/admin/consultations">Back to patients</Link>
              </Button>
              <Button onClick={() => window.location.reload()}>Register another</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Register New Patient
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Creates the portal account and issues a temporary password to hand to the patient — they choose
          their own at first sign-in. Required fields: name, sex, date of birth, phone, and email.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-lg font-bold">Identity &amp; Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="fullName" label="Full name" required error={errors.fullName?.[0]}>
              <input id="fullName" name="fullName" type="text" required disabled={pending} className={inputClass} />
            </Field>
            <Field id="dob" label="Date of birth" required error={errors.dob?.[0]}>
              <input id="dob" name="dob" type="date" required disabled={pending} className={inputClass} />
            </Field>
            <Field id="sex" label="Sex" required error={errors.sex?.[0]}>
              <select id="sex" name="sex" required disabled={pending} defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select…
                </option>
                {SEXES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="email" label="Email" required error={errors.email?.[0]}>
              <input id="email" name="email" type="email" required disabled={pending} className={inputClass} />
            </Field>
            <Field id="phone" label="Phone" required error={errors.phone?.[0]}>
              <input id="phone" name="phone" type="tel" required disabled={pending} className={inputClass} />
            </Field>
            <Field id="genderIdentity" label="Gender identity" error={errors.genderIdentity?.[0]}>
              <select id="genderIdentity" name="genderIdentity" disabled={pending} defaultValue="" className={inputClass}>
                <option value="">Not specified</option>
                {GENDER_IDENTITIES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="maritalStatus" label="Marital status" error={errors.maritalStatus?.[0]}>
              <select id="maritalStatus" name="maritalStatus" disabled={pending} defaultValue="" className={inputClass}>
                <option value="">Not specified</option>
                {MARITAL_STATUSES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMoreDetails((v) => !v)}
          aria-expanded={showMoreDetails}
        >
          <ChevronDown className={`size-3.5 transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
          {showMoreDetails ? "Hide additional details" : "Add more details"}
        </Button>

        {/* Inputs here stay mounted (just visually hidden) rather than
            conditionally rendered, so anything already typed survives
            toggling this open and closed — a real risk for uncontrolled
            native inputs, which lose their value the moment they unmount. */}
        <div className={`space-y-6 ${showMoreDetails ? "" : "hidden"}`}>
          <Card>
            <CardHeader>
              <CardTitle>Contact &amp; background</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="occupation" label="Occupation" error={errors.occupation?.[0]}>
                <input id="occupation" name="occupation" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="educationLevel" label="Highest level of education" error={errors.educationLevel?.[0]}>
                <input id="educationLevel" name="educationLevel" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="religion" label="Religion / faith" error={errors.religion?.[0]}>
                <input id="religion" name="religion" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="ethnicity" label="Ethnicity" error={errors.ethnicity?.[0]}>
                <input id="ethnicity" name="ethnicity" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="nationality" label="Nationality" error={errors.nationality?.[0]}>
                <input id="nationality" name="nationality" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="residence" label="Place of residence" error={errors.residence?.[0]}>
                <input id="residence" name="residence" type="text" disabled={pending} className={inputClass} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next of kin / primary caregiver</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="nextOfKinName" label="Name" error={errors.nextOfKinName?.[0]}>
                <input id="nextOfKinName" name="nextOfKinName" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="nextOfKinRelationship" label="Relationship" error={errors.nextOfKinRelationship?.[0]}>
                <input
                  id="nextOfKinRelationship"
                  name="nextOfKinRelationship"
                  type="text"
                  disabled={pending}
                  className={inputClass}
                />
              </Field>
              <Field id="nextOfKinContact" label="Contact" error={errors.nextOfKinContact?.[0]}>
                <input id="nextOfKinContact" name="nextOfKinContact" type="text" disabled={pending} className={inputClass} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informant</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="informantName" label="Name" error={errors.informantName?.[0]}>
                <input id="informantName" name="informantName" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field
                id="informantRelationship"
                label="Relationship to patient"
                error={errors.informantRelationship?.[0]}
              >
                <input
                  id="informantRelationship"
                  name="informantRelationship"
                  type="text"
                  disabled={pending}
                  className={inputClass}
                />
              </Field>
              <Field id="informantReliability" label="Reliability" error={errors.informantReliability?.[0]}>
                <select
                  id="informantReliability"
                  name="informantReliability"
                  disabled={pending}
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  {INFORMANT_RELIABILITIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <Field id="referralSource" label="Referral source" error={errors.referralSource?.[0]}>
                <input id="referralSource" name="referralSource" type="text" disabled={pending} className={inputClass} />
              </Field>
              <Field id="referralReason" label="Reason for referral" error={errors.referralReason?.[0]}>
                <textarea
                  id="referralReason"
                  name="referralReason"
                  rows={3}
                  disabled={pending}
                  className={inputClass}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {state.status === "error" && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link href="/admin/consultations">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending invite…" : "Send invite"}
          </Button>
        </div>
      </form>
    </main>
  );
}
