"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HeartHandshake,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState, useActionState } from "react";

import {
  submitConsultationRequest,
  type SubmitConsultationRequestResult,
} from "@/actions/submit-consultation-request";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import {
  errorInputClass,
  inputClass,
  selectClass,
  textareaClass,
} from "@/lib/form-ui";
import { cn } from "@/lib/utils";

const MODES = [
  {
    value: "flexible",
    label: "Flexible",
    description: "Either in-person or virtual",
    icon: Sparkles,
  },
  {
    value: "virtual",
    label: "Virtual / Telehealth",
    description: "Secure online video session",
    icon: Video,
  },
  {
    value: "in_person",
    label: "In-Person Clinic",
    description: "Private clinic consultation",
    icon: MapPin,
  },
] as const;

export function ConsultationRequestForm() {
  const [state, formAction, pending] = useActionState(
    submitConsultationRequest,
    initialActionState as SubmitConsultationRequestResult
  );

  const [selectedMode, setSelectedMode] = useState<string>("flexible");

  if (state.status === "success") {
    const fullName = state.data?.fullName || "there";
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-card p-8 sm:p-10 shadow-xl text-center space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Request Received!
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Thank you, <span className="font-semibold text-foreground">{fullName}</span>.
            Dr. Alex Vico Korda’s clinic has received your consultation request.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground text-left space-y-2 max-w-md mx-auto">
          <div className="flex items-start gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Your information is strictly confidential and protected under patient privacy standards.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Our office will review your request and reach out directly via Phone/WhatsApp or Email with your appointment schedule and portal credentials.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/login">Go to Patient Login</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive animate-in fade-in-50"
        >
          {state.message}
        </div>
      )}

      {/* 1. Contact & Identity Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <User className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            1. Your Personal Information
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                disabled={pending}
                placeholder="e.g. Jane Doe"
                className={cn(
                  inputClass,
                  "pl-10",
                  errors?.fullName && errorInputClass
                )}
              />
            </div>
            {errors?.fullName && (
              <p className="mt-1 text-xs text-destructive">{errors.fullName[0]}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Email Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={pending}
                placeholder="name@example.com"
                className={cn(
                  inputClass,
                  "pl-10",
                  errors?.email && errorInputClass
                )}
              />
            </div>
            {errors?.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email[0]}</p>
            )}
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Phone / WhatsApp Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                disabled={pending}
                placeholder="+233 24 000 0000"
                className={cn(
                  inputClass,
                  "pl-10",
                  errors?.phone && errorInputClass
                )}
              />
            </div>
            {errors?.phone && (
              <p className="mt-1 text-xs text-destructive">{errors.phone[0]}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label
              htmlFor="dob"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Date of Birth <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="dob"
                name="dob"
                type="date"
                disabled={pending}
                className={cn(
                  inputClass,
                  "pl-10",
                  errors?.dob && errorInputClass
                )}
              />
            </div>
            {errors?.dob && (
              <p className="mt-1 text-xs text-destructive">{errors.dob[0]}</p>
            )}
          </div>

          {/* Sex */}
          <div>
            <label
              htmlFor="sex"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Sex <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <select
              id="sex"
              name="sex"
              disabled={pending}
              defaultValue=""
              className={cn(selectClass, errors?.sex && errorInputClass)}
            >
              <option value="">Select sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="intersex">Intersex</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Consultation Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <HeartHandshake className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            2. Consultation Preferences
          </h3>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">
            Preferred Consultation Mode
          </label>
          <input type="hidden" name="preferredMode" value={selectedMode} />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setSelectedMode(mode.value)}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary shadow-2xs text-foreground"
                      : "border-border/80 bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={cn(
                        "size-4",
                        isSelected ? "text-primary font-bold" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-xs font-bold text-foreground">
                      {mode.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {mode.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Time / Days */}
        <div>
          <label
            htmlFor="preferredTime"
            className="block text-xs font-semibold text-foreground mb-1"
          >
            Preferred Days / Time Windows <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              id="preferredTime"
              name="preferredTime"
              type="text"
              disabled={pending}
              placeholder="e.g. Weekday afternoons or Saturday mornings"
              className={cn(inputClass, "pl-10")}
            />
          </div>
        </div>
      </div>

      {/* 3. Reason for Consultation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              3. Reason for Consultation
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="size-3 text-primary" />
            <span>Strictly Confidential</span>
          </div>
        </div>

        <div>
          <label
            htmlFor="reason"
            className="block text-xs font-semibold text-foreground mb-1"
          >
            Briefly describe your main concerns or what you would like support with <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={4}
            disabled={pending}
            placeholder="Please share any symptoms, concerns, or previous treatments you would like the doctor to know prior to your visit..."
            className={cn(textareaClass, "resize-y")}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full font-bold text-sm h-11 shadow-md shadow-primary/20"
        >
          {pending ? "Submitting Request…" : "Submit Consultation Request"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Your data is encrypted and handled with medical-grade privacy standards.</span>
        </p>
      </div>
    </form>
  );
}
