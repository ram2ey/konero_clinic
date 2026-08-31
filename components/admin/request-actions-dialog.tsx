"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { approveAndOnboardRequest } from "@/actions/process-consultation-request";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApproveRequestButton({
  requestId,
  clientPhone,
  onApproved,
}: {
  requestId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  onApproved?: (patientId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<{
    patientId: string;
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const handleApprove = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await approveAndOnboardRequest(requestId);
      if (res.status === "success" && res.data) {
        setCreatedData(res.data);
        // onApproved is deliberately not called here. It flips the
        // request's status in the parent table's state to "approved",
        // which swaps this button out for a plain "View Patient Chart"
        // link (see RequestsTable) — React batches that with the
        // setCreatedData above into a single commit, so calling it now
        // would unmount this dialog in the same render pass that was
        // supposed to show it, before the admin ever sees the generated
        // temp password. It fires instead once the dialog is closed.
      } else {
        setError(res.message || "Failed to onboard patient.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const copyPasswordOnly = () => {
    if (!createdData) return;
    navigator.clipboard.writeText(createdData.tempPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const copyWhatsAppMessage = () => {
    if (!createdData) return;
    const msg = `Hello ${createdData.fullName},\n\nYour patient account with Konero Clinic has been created.\n\nYou can access your patient portal here:\n🔗 https://dralexvicokorda.com/login\n\n📧 Email: ${createdData.email}\n🔑 Temporary Password: ${createdData.tempPassword}\n\n(You will be asked to set your own permanent password upon your first sign-in).\n\nBest regards,\nKonero Clinic`;
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  // Clean phone number for WhatsApp link
  const cleanPhone = clientPhone.replace(/[^0-9]/g, "");
  const waUrl = createdData
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${createdData.fullName}, your patient account with Konero Clinic has been approved. You can log in at https://dralexvicokorda.com/login using Email: ${createdData.email} and Temporary Password: ${createdData.tempPassword}`
      )}`
    : `https://wa.me/${cleanPhone}`;

  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="default"
        onClick={handleApprove}
        disabled={pending}
        className="gap-1.5 font-semibold text-xs h-7 bg-primary text-primary-foreground shadow-2xs cursor-pointer"
      >
        <UserCheck className="size-3.5" />
        <span>{pending ? "Creating Account…" : "Approve & Onboard"}</span>
      </Button>

      {error && (
        <span className="block text-[11px] text-destructive mt-1 font-medium">
          {error}
        </span>
      )}

      {/* Success Dialog Modal */}
      <Dialog
        open={!!createdData}
        onOpenChange={(open) => {
          if (!open) {
            if (createdData && onApproved) onApproved(createdData.patientId);
            setCreatedData(null);
          }
        }}
      >
        <DialogContent className="max-w-md p-6 bg-card border-border shadow-2xl rounded-2xl">
          <DialogHeader className="text-center sm:text-left space-y-1.5 pb-2 border-b border-border/70">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Patient Account Created!
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Patient profile has been registered for{" "}
              <strong className="text-foreground">{createdData?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {createdData && (
            <div className="space-y-4 pt-2">
              {/* Credentials Box */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Login Email
                  </span>
                  <p className="font-mono text-xs font-semibold text-foreground mt-0.5 select-all">
                    {createdData.email}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Generated Temporary Password
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 font-mono text-sm font-bold text-primary">
                    <span className="select-all tracking-wider">{createdData.tempPassword}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={copyPasswordOnly}
                      className="h-6 gap-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* One-Click Share Actions */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyWhatsAppMessage}
                  className="w-full justify-center gap-2 text-xs font-semibold"
                >
                  {copiedWhatsApp ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span>Copied WhatsApp Invitation Text!</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="size-3.5 text-emerald-600" />
                      <span>Copy Formatted WhatsApp Message</span>
                    </>
                  )}
                </Button>

                {cleanPhone && (
                  <Button asChild variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5 flex items-center justify-center">
                      <span>Open in WhatsApp</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Direct Navigation to Patient Chart */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                <Button asChild variant="default" size="sm" className="gap-1.5 text-xs font-semibold">
                  <Link href={`/admin/consultations/${createdData.patientId}`}>
                    <span>View Patient Record</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
