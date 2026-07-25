"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportDownloadButtonProps = {
  comparisonId: string;
};

export function ReportDownloadButton({
  comparisonId,
}: ReportDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch(`/api/compare/${comparisonId}/report`);
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(json.message ?? "Could not download the report.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "comparison-report.docx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void handleDownload();
        }}
        disabled={downloading}
      >
        <Download />
        {downloading ? "Downloading…" : "Download Report"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
