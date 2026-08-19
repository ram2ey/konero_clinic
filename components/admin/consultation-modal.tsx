"use client";

import { FileText, Printer } from "lucide-react";
import { useState } from "react";
import { type VariantProps } from "class-variance-authority";

import {
  ConsultationDetail,
  ConsultationDetailView,
} from "@/components/admin/consultation-detail-view";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ButtonProps = VariantProps<typeof buttonVariants>;

export function ConsultationModal({
  consultation,
  patientName,
  triggerText = "View full record",
  variant = "ghost",
  size = "sm",
  className = "",
}: {
  consultation: ConsultationDetail;
  patientName?: string | null;
  triggerText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 font-medium transition-all ${className}`}
        >
          <FileText className="size-3.5 text-primary" />
          <span>{triggerText}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="w-full max-w-4xl lg:max-w-5xl max-h-[88vh] flex flex-col p-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-card"
        showCloseButton={true}
      >
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-border/70 bg-muted/20 shrink-0 pr-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  Clinical Consultation Record
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {patientName ? `Patient: ${patientName} • ` : ""}
                  Comprehensive clinical assessment, vitals, mental state examination &amp; management plan
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 h-7 text-xs mr-4"
              title="Print consultation notes"
            >
              <Printer className="size-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Consultation Details Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <ConsultationDetailView consultation={consultation} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
