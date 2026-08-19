export const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
export const textareaClass = `${inputClass} min-h-24`;
// For a <select> that sits next to a flex-1 growing input: `w-full`
// alone (no flex-basis override) makes an unconstrained flex child claim
// 100% of the row as its flex-basis, which starves the actual growing
// sibling down to near-zero width during flex-shrink. `shrink-0` keeps
// it sized to its content instead.
export const selectClass = "shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
export const errorInputClass = "border-destructive focus-visible:ring-destructive/40";

export function orUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
