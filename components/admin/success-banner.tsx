"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shows a one-time success banner when the page is landed on with
 * `?{param}=1` in the URL (set by the action that redirected here), then
 * strips that param from the address bar so a manual refresh doesn't
 * keep re-showing it. Needs a <Suspense> boundary at the call site —
 * useSearchParams() requires one.
 */
export function SuccessBanner({ param, message }: { param: string; message: string }) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get(param) !== "1") return;

    setVisible(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState({}, "", url.toString());
    // Only ever meant to fire once, off the URL this page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{message}</span>
    </div>
  );
}
