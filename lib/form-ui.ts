export const inputClass =
  "w-full rounded-lg border border-input/80 bg-card px-3.5 py-2 text-sm text-foreground shadow-xs transition-all duration-150 outline-none placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/60";
export const textareaClass = `${inputClass} min-h-24 leading-relaxed`;
export const selectClass =
  "shrink-0 rounded-lg border border-input/80 bg-card px-3.5 py-2 text-sm text-foreground shadow-xs transition-all duration-150 outline-none hover:border-primary/40 focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/60";
export const errorInputClass = "!border-destructive !focus:ring-destructive/20";

export function orUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
