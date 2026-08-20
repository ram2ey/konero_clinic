"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { resetPatientPassword } from "@/actions/reset-patient-password";
import { TempPasswordPanel } from "@/components/admin/temp-password-panel";
import { Button } from "@/components/ui/button";

interface ResetPasswordButtonProps {
  patientId: string;
  patientName?: string | null;
  patientEmail?: string | null;
  variant?: "outline" | "secondary" | "default" | "ghost";
  size?: "default" | "sm" | "xs";
  className?: string;
  showIconOnly?: boolean;
}

/**
 * Issues a new temporary password for a patient who can't get in.
 *
 * Replaces the old "Resend Invite" button: onboarding no longer sends
 * email, so the fix for a locked-out patient is a fresh credential handed
 * over at the desk. The result panel stays on screen until dismissed —
 * unlike the old transient "Invite Sent" toast, this one contains
 * something the admin has to read and pass on, so it must not
 * auto-disappear.
 */
export function ResetPasswordButton({
  patientId,
  patientName,
  patientEmail,
  variant = "outline",
  size = "sm",
  className = "",
  showIconOnly = false,
}: ResetPasswordButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ tempPassword: string; email?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setError(null);
    startTransition(async () => {
      const result = await resetPatientPassword(patientId);
      if (result.status === "success" && result.tempPassword) {
        setIssued({ tempPassword: result.tempPassword, email: result.email });
      } else {
        setError(result.message ?? "Failed to reset the password.");
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={isPending}
        onClick={handleReset}
        className={`gap-1.5 font-medium transition-all ${className}`}
        title={
          patientEmail
            ? `Issue a new temporary password for ${patientEmail}`
            : patientName
              ? `Issue a new temporary password for ${patientName}`
              : "Issue a new temporary password"
        }
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            {!showIconOnly && <span>Resetting…</span>}
          </>
        ) : (
          <>
            <KeyRound className="size-3.5 text-primary" />
            {!showIconOnly && <span>Reset Password</span>}
          </>
        )}
      </Button>

      {error && (
        <p className="text-[11px] font-medium leading-tight text-destructive" role="alert">
          {error}
        </p>
      )}

      {issued && (
        <div className="mt-1 w-full min-w-64 max-w-sm">
          <TempPasswordPanel email={issued.email} tempPassword={issued.tempPassword} />
          <button
            type="button"
            onClick={() => setIssued(null)}
            className="mt-1.5 text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
