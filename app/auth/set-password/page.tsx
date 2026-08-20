"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { completePasswordChange } from "@/actions/complete-password-change";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LinkState = "checking" | "ready" | "invalid";
type Flow = "invite" | "recovery";

export default function SetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [flow, setFlow] = useState<Flow>("invite");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    // Check if the URL already arrived with an error in the hash or search params
    if (typeof window !== "undefined") {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(window.location.search);

      const hasError =
        hashParams.get("error") ||
        hashParams.get("error_code") ||
        searchParams.get("error");

      if (hasError) {
        resolvedRef.current = true;
        const description =
          hashParams.get("error_description") ||
          searchParams.get("error_description") ||
          "This email link is invalid or has expired.";
        setErrorMessage(decodeURIComponent(description.replace(/\+/g, " ")));
        setLinkState("invalid");
        return;
      }
    }

    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        resolvedRef.current = true;
        if (event === "PASSWORD_RECOVERY") setFlow("recovery");
        setLinkState("ready");
      }
    });

    // onAuthStateChange fires once immediately with whatever state
    // already exists, but the URL-fragment session may take a moment to
    // parse — give it a few seconds before concluding the link is bad.
    const timeout = setTimeout(() => {
      if (!resolvedRef.current) setLinkState("invalid");
    }, 4000);

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

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message || "Failed to set your password. Please try again.");
      return;
    }

    // Clears app_metadata.must_change_password for patients onboarded with
    // a temporary password. It has to happen server-side — the flag is
    // service-role-only by design — and it has to happen before we
    // navigate, or middleware will bounce us straight back here.
    //
    // Harmless no-op for the password-recovery flow, where the flag was
    // never set in the first place.
    const result = await completePasswordChange();
    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message ?? "Failed to finish setting up your account.");
      return;
    }

    setSuccess(true);
    router.push("/portal");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {flow === "recovery" ? "Reset your password" : "Set your password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {flow === "recovery"
            ? "Enter a new password for your account."
            : "Finish setting up your account to access your patient portal."}
        </p>

        {linkState === "checking" && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Verifying your link…</span>
          </div>
        )}

        {linkState === "invalid" && (
          <div className="mt-6 space-y-4">
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs leading-relaxed text-destructive"
            >
              <p className="font-semibold">Link Expired or Invalid</p>
              <p className="mt-1">
                {errorMessage ||
                  "This link is invalid or has expired. Ask your clinic to resend an invite, or request a new password reset."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="default" size="sm" className="w-full">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/login">Return to Sign In</Link>
              </Button>
            </div>
          </div>
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
