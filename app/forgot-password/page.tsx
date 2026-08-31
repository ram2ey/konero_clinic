"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { forgotPassword } from "@/actions/forgot-password";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import { inputClass } from "@/lib/form-ui";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialActionState);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Subtle atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="size-[500px] rounded-full bg-gradient-to-tr from-primary/10 via-blue-600/5 to-brand-gold/10 blur-3xl opacity-70" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <BrandLogo
            size="lg"
            className="items-center text-center"
          />
        </div>

        {/* Elevated Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-7 sm:p-8 shadow-[0_4px_20px_0_rgba(0,0,0,0.05),0_1px_3px_0_rgba(0,0,0,0.03)] backdrop-blur-sm dark:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)]">
          <div className="mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Reset password</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              Enter your email address and we will send you a secure link to reset your account password.
            </p>
          </div>

          {state.status === "success" ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300"
            >
              {state.message}
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                    disabled={pending}
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
                {state.fieldErrors?.email && (
                  <p className="mt-1.5 text-xs text-destructive font-medium">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              {state.status === "error" && !state.fieldErrors && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium text-destructive"
                >
                  {state.message}
                </div>
              )}

              <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full font-semibold shadow-sm shadow-primary/25 cursor-pointer">
                {pending ? "Sending link…" : "Send reset link"}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
