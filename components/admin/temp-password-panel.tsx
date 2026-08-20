"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";

/**
 * Displays a freshly issued temporary password.
 *
 * This is the only time the password is ever visible — it isn't stored
 * anywhere, so the copy affordance and the "won't be shown again" warning
 * are load-bearing, not decoration. If it's lost, the recovery path is to
 * issue a new one, not to look this one up.
 */
export function TempPasswordPanel({
  email,
  tempPassword,
}: {
  email?: string | null;
  tempPassword: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions) —
      // the password is selectable on screen either way, so there is
      // nothing to recover from here.
    }
  }

  return (
    <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-left">
      <div className="flex items-center gap-1.5">
        <KeyRound className="size-3.5 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          Temporary password
        </h3>
      </div>

      {email && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sign in at <span className="font-medium text-foreground">{email}</span>
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 select-all rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm font-bold tracking-wide text-foreground">
          {tempPassword}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy temporary password"
          className="shrink-0 rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Give this to the patient. <span className="font-medium text-foreground">It will not be shown
        again</span> — if it&apos;s lost, issue a new one from their folder. They&apos;ll be asked to
        choose their own password the first time they sign in.
      </p>
    </div>
  );
}
