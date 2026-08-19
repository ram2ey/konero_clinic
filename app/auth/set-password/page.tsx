"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LinkState = "checking" | "ready" | "invalid";

// Supabase's invite email points back here with the session encoded as a
// URL fragment (#access_token=...), not a query param — fragments never
// reach a server, so this session can only be picked up client-side.
// createBrowserClient's detectSessionInUrl (on by default) parses it
// automatically; onAuthStateChange is how we know it's actually done.
export default function SetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        resolvedRef.current = true;
        setLinkState("ready");
      }
    });

    // onAuthStateChange fires once immediately with whatever state
    // already exists, but the URL-fragment session may take a moment to
    // parse — give it a few seconds before concluding the link is bad.
    const timeout = setTimeout(() => {
      if (!resolvedRef.current) setLinkState("invalid");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message || "Failed to set your password. Please try again.");
      return;
    }

    setSuccess(true);
    router.push("/portal");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Set your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish setting up your account to access your patient portal.
        </p>

        {linkState === "checking" && (
          <p className="mt-6 text-sm text-muted-foreground">Verifying your invite link…</p>
        )}

        {linkState === "invalid" && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            This link is invalid or has expired. Ask your clinic to send a new invite.
          </p>
        )}

        {linkState === "ready" && !success && (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Setting password…" : "Set password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
