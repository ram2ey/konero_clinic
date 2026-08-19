"use client";

import { Check, Loader2, Mail } from "lucide-react";
import { useState, useTransition } from "react";

import { reinvitePatient } from "@/actions/reinvite-patient";
import { Button } from "@/components/ui/button";

interface ReinvitePatientButtonProps {
  patientId: string;
  patientName?: string | null;
  patientEmail?: string | null;
  variant?: "outline" | "secondary" | "default" | "ghost";
  size?: "default" | "sm" | "xs";
  className?: string;
  showIconOnly?: boolean;
}

export function ReinvitePatientButton({
  patientId,
  patientName,
  patientEmail,
  variant = "outline",
  size = "sm",
  className = "",
  showIconOnly = false,
}: ReinvitePatientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleReinvite = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await reinvitePatient(patientId);
      if (result.status === "success") {
        setFeedback({
          type: "success",
          message: result.message ?? "Invite sent successfully.",
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({
          type: "error",
          message: result.message ?? "Failed to send invite.",
        });
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant={feedback?.type === "success" ? "secondary" : variant}
        size={size}
        disabled={isPending}
        onClick={handleReinvite}
        className={`gap-1.5 font-medium transition-all ${className}`}
        title={
          patientEmail
            ? `Resend portal invite to ${patientEmail}`
            : patientName
            ? `Resend portal invite to ${patientName}`
            : "Resend patient portal invite"
        }
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            {!showIconOnly && <span>Sending invite…</span>}
          </>
        ) : feedback?.type === "success" ? (
          <>
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            {!showIconOnly && <span className="text-emerald-700 dark:text-emerald-400">Invite Sent</span>}
          </>
        ) : (
          <>
            <Mail className="size-3.5 text-primary" />
            {!showIconOnly && <span>Resend Invite</span>}
          </>
        )}
      </Button>

      {feedback && !showIconOnly && (
        <p
          className={`text-[11px] font-medium leading-tight ${
            feedback.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }`}
          role="alert"
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
