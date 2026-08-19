"use client";

import { useActionState } from "react";

import { signIn } from "@/actions/sign-in";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialActionState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Clinic patient &amp; admin portal.</p>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            {state.fieldErrors?.password && (
              <p className="mt-1 text-xs text-destructive">{state.fieldErrors.password[0]}</p>
            )}
          </div>

          {state.status === "error" && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
