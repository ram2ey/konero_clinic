import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type React from "react";

import { cn } from "@/lib/utils";

type Trend = {
  changePercent: number;
  /** Caller decides meaning — an increase isn't always "good" (e.g. amount
   * owed going up), so this never gets inferred from the sign alone. */
  tone?: "positive" | "negative" | "neutral";
  label?: string;
};

export function StatTile({
  label,
  value,
  trend,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  trend?: Trend;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-primary/30 hover:shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
            <Icon className="size-3.5" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {trend && <TrendDelta {...trend} />}
    </div>
  );
}

function TrendDelta({ changePercent, tone = "neutral", label = "vs last month" }: Trend) {
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  
  const toneClasses = {
    positive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    negative: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    neutral: "bg-muted text-muted-foreground border-border/60",
  }[tone];

  return (
    <div className="mt-2.5 flex items-center">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
          toneClasses
        )}
      >
        <Icon className="size-3 shrink-0" />
        {Math.abs(changePercent).toFixed(1)}% {label}
      </span>
    </div>
  );
}
