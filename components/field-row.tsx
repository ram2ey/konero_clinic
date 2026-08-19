import type React from "react";
import { cn } from "@/lib/utils";

export function FieldRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 group", className)}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground shadow-2xs group-hover:border-primary/30 group-hover:text-primary transition-colors">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
