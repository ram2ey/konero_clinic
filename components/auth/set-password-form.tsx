"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { completePasswordChange } from "@/actions/complete-password-change";
import { Button } from "@/components/ui/button";

/**
 * The "set your password" form for a patient onboarded with a temporary
 * password. Rendered only after the server shell has confirmed there's a
 * signed-in user with `must_change_password = true` — there is no
 * magic-link / recovery flow any more, so this is the single path here.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const result = await completePasswordChange({ password });
    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message ?? "Failed to set your password. Please try again.");
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
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
          className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm text-foreground"
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
          className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm text-foreground"
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
  );
}
