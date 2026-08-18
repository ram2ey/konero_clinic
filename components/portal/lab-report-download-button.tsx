"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { getLabDownloadUrl } from "@/actions/get-lab-download-url";
import { Button } from "@/components/ui/button";

type LabReportDownloadButtonProps = {
  patientId: string;
  filePath: string;
};

export function LabReportDownloadButton({ patientId, filePath }: LabReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fallback link shown only if the browser blocked the tab we tried to
  // open below — lets the user open it with an explicit click instead.
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    setFallbackUrl(null);

    // Open the tab synchronously, inside the click handler, before the
    // signed URL exists — a tab opened after an await is no longer
    // reliably treated as user-gesture-triggered and gets blocked by
    // popup blockers in some browsers. We navigate this blank tab once
    // the real URL comes back instead.
    const pendingTab = window.open("", "_blank");

    const result = await getLabDownloadUrl({ patientId, filePath });

    if (result.status !== "success" || !result.url) {
      pendingTab?.close();
      setError(result.message ?? "Failed to open document.");
      setLoading(false);
      return;
    }

    if (pendingTab) {
      pendingTab.location.href = result.url;
    } else {
      setFallbackUrl(result.url);
    }

    setLoading(false);
  }

  if (fallbackUrl) {
    return (
      <a
        href={fallbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        Open document
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        View
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
