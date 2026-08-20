import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { ConsultationRequestForm } from "@/components/public/consultation-request-form";
import { BrandLogo } from "@/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "Request a Consultation | Dr. Alex Vico Korda",
  description:
    "Schedule a private psychiatric or mental health consultation with Dr. Alex Vico Korda. Available for in-person clinic visits and secure virtual telehealth consultations.",
  openGraph: {
    title: "Request a Consultation | Dr. Alex Vico Korda",
    description:
      "Schedule a private psychiatric or mental health consultation with Dr. Alex Vico Korda. Confidential, expert clinical care.",
    type: "website",
  },
};

export default function RequestConsultationPage() {
  return (
    <main className="relative min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="size-[650px] rounded-full bg-gradient-to-tr from-primary/10 via-brand-navy/5 to-brand-gold/10 blur-3xl opacity-60" />
      </div>

      <div className="relative mx-auto max-w-2xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Login</span>
          </Link>

          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60">
            <Lock className="size-3 text-primary" />
            <span>Confidential &amp; Secure</span>
          </div>
        </div>

        {/* Brand & Introduction */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size="lg" className="items-center text-center" />

          <div className="space-y-1.5 max-w-lg">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Request a Consultation
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Schedule a private psychiatric or mental health consultation. Fill in your
              details below, and Dr. Alex Vico Korda’s office will contact you directly with
              your appointment schedule.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl backdrop-blur-sm">
          <ConsultationRequestForm />
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-muted-foreground space-y-2 pt-2 pb-8">
          <p>
            Already have an active patient account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Sign in to Patient Portal
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} Dr. Alex Vico Korda. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
