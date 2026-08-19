"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPassword } from "@/actions/forgot-password";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialActionState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {state.status === "success" ? (
          <p role="status" className="mt-6 text-sm text-foreground">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            {state.status === "error" && !state.fieldErrors && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
