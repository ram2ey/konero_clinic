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
      className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
    >
      <CheckCircle2 className="size-4 shrink-0" />
      {message}
    </div>
  );
}
