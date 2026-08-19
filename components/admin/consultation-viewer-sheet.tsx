"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import {
  ConsultationDetail,
  ConsultationDetailView,
} from "@/components/admin/consultation-detail-view";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type VariantProps } from "class-variance-authority";

type ButtonProps = VariantProps<typeof buttonVariants>;

export function ConsultationViewerSheet({
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 font-medium transition-all ${className}`}
        >
          <FileText className="size-3.5 text-primary" />
          <span>{triggerText}</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto p-6 space-y-6"
      >
        <SheetHeader className="p-0 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-foreground">
                Clinical Consultation Record
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {patientName ? `Patient: ${patientName} • ` : ""}
                Complete assessment, vitals, mental state examination &amp; management plan
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="pt-2">
          <ConsultationDetailView consultation={consultation} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
