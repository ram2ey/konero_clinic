import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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
  className,
}: {
  label: string;
  value: string;
  trend?: Trend;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/40 p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      {trend && <TrendDelta {...trend} />}
    </div>
  );
}

function TrendDelta({ changePercent, tone = "neutral", label = "vs last month" }: Trend) {
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <p className={cn("mt-1 flex items-center gap-0.5 text-xs", toneClass)}>
      <Icon className="size-3" />
      {Math.abs(changePercent).toFixed(1)}% {label}
    </p>
  );
}
