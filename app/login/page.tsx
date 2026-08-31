"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/actions/sign-in";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import { inputClass } from "@/lib/form-ui";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialActionState);

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

        {/* Elevated Login Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-7 sm:p-8 shadow-[0_4px_20px_0_rgba(0,0,0,0.05),0_1px_3px_0_rgba(0,0,0,0.03)] backdrop-blur-sm dark:shadow-[0_4px_20px_0_rgba(0,0,0,0.4)]">
          <div className="mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
          </div>

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

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  disabled={pending}
                  className={cn(inputClass, "pl-10")}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary font-medium hover:underline underline-offset-4 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              {state.fieldErrors?.password && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{state.fieldErrors.password[0]}</p>
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
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                "Sign in to Portal"
              )}
            </Button>
          </form>

          {/* New Patient CTA */}
          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Looking to schedule a new appointment?
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full font-semibold border-primary/30 text-primary hover:bg-primary/10"
            >
              <Link href="/request-consultation">
                Request a Consultation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
