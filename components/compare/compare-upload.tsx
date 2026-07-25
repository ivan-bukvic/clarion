"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Diff, LoaderCircle } from "lucide-react";
import type { Database, Tables } from "@/types/supabase";
import { FindingsTable } from "@/components/compare/findings-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type DocumentRow = Tables<"documents">;
type ComparisonRow = Tables<"comparisons">;
type FindingRow = Tables<"comparison_findings">;

type Slot = "a" | "b";

type ReportStatus = Database["public"]["Enums"]["report_status"];

type CompareResult = {
  comparison: ComparisonRow;
  findings: FindingRow[];
  reportStatus: ReportStatus;
};

const PROGRESS_STEPS = [
  "Retrieving documents…",
  "Analyzing differences…",
  "Generating report…",
] as const;

export function CompareUpload({
  documents,
}: {
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const readyDocs = useMemo(
    () =>
      documents.filter(
        (d) => d.purpose === "comparison" && d.status === "ready"
      ),
    [documents]
  );

  const [documentAId, setDocumentAId] = useState<string>("");
  const [documentBId, setDocumentBId] = useState<string>("");
  const [uploadingSlots, setUploadingSlots] = useState<{
    a: boolean;
    b: boolean;
  }>({ a: false, b: false });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progressValue, setProgressValue] = useState(8);
  const [progressLabel, setProgressLabel] = useState<string>(PROGRESS_STEPS[0]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const progressTimersRef = useRef<number[]>([]);

  function clearProgressTimers() {
    progressTimersRef.current.forEach((id) => window.clearTimeout(id));
    progressTimersRef.current = [];
  }

  function startProgressAnimation() {
    clearProgressTimers();
    setProgressValue(12);
    setProgressLabel(PROGRESS_STEPS[0]);
    progressTimersRef.current = [
      window.setTimeout(() => {
        setProgressValue(45);
        setProgressLabel(PROGRESS_STEPS[1]);
      }, 1200),
      window.setTimeout(() => {
        setProgressValue(72);
        setProgressLabel(PROGRESS_STEPS[2]);
      }, 3200),
    ];
  }

  function selectDocument(slot: Slot, id: string) {
    // Changing either side invalidates the previous comparison result —
    // never leave stale findings/summary on screen for a new document pair.
    setResult(null);
    setCompareError(null);
    if (slot === "a") {
      setDocumentAId(id);
    } else {
      setDocumentBId(id);
    }
  }

  useEffect(() => {
    return () => {
      clearProgressTimers();
    };
  }, []);

  async function uploadForSlot(slot: Slot, file: File | null) {
    setUploadError(null);
    if (!file) return;

    setUploadingSlots((prev) => ({ ...prev, [slot]: true }));
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", "comparison");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body,
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        document?: DocumentRow;
      };

      if (!res.ok || !json.document) {
        setUploadError(json.message ?? "Upload failed. Please try again.");
        return;
      }

      selectDocument(slot, json.document.id);
      router.refresh();
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [slot]: false }));
    }
  }

  async function runComparison(event?: FormEvent) {
    event?.preventDefault();
    setCompareError(null);
    setResult(null);

    if (!documentAId || !documentBId) {
      setCompareError("Select Document A and Document B before comparing.");
      return;
    }
    if (documentAId === documentBId) {
      setCompareError("Document A and Document B must be different files.");
      return;
    }

    setRunning(true);
    startProgressAnimation();
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_a_id: documentAId,
          document_b_id: documentBId,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
        comparison?: ComparisonRow;
        findings?: FindingRow[];
        report?: { status?: ReportStatus };
      };

      if (!res.ok) {
        setCompareError(
          json.message ?? "Comparison failed. Please try again."
        );
        // When the route marked comparisons.status = 'failed', surface that
        // row so FindingsTable can show Retry (FRONTEND_MASTER.md §8).
        if (json.comparison) {
          const status = json.report?.status;
          setResult({
            comparison: json.comparison,
            findings: json.findings ?? [],
            reportStatus:
              status === "pending" ||
              status === "ready" ||
              status === "failed"
                ? status
                : "failed",
          });
        }
        return;
      }

      if (!json.comparison) {
        setCompareError("Comparison failed. Please try again.");
        return;
      }

      setProgressValue(100);
      const status = json.report?.status;
      setResult({
        comparison: json.comparison,
        findings: json.findings ?? [],
        reportStatus:
          status === "pending" || status === "ready" || status === "failed"
            ? status
            : "pending",
      });
    } catch {
      setCompareError("Comparison failed. Please try again.");
    } finally {
      clearProgressTimers();
      setRunning(false);
    }
  }

  const anyUploading = uploadingSlots.a || uploadingSlots.b;
  const canStart =
    Boolean(documentAId) &&
    Boolean(documentBId) &&
    documentAId !== documentBId &&
    !running &&
    !anyUploading;

  return (
    <div className="space-y-8">
      <form onSubmit={runComparison} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <DocumentSlot
            label="Document A"
            selectId="document-a"
            selectedId={documentAId}
            options={readyDocs.filter((d) => d.id !== documentBId)}
            uploading={uploadingSlots.a}
            onSelect={(id) => selectDocument("a", id)}
            onUpload={(file) => uploadForSlot("a", file)}
          />
          <DocumentSlot
            label="Document B"
            selectId="document-b"
            selectedId={documentBId}
            options={readyDocs.filter((d) => d.id !== documentAId)}
            uploading={uploadingSlots.b}
            onSelect={(id) => selectDocument("b", id)}
            onUpload={(file) => uploadForSlot("b", file)}
          />
        </div>

        {uploadError ? (
          <p className="text-sm text-destructive" role="alert">
            {uploadError}
          </p>
        ) : null}

        {running ? (
          <div className="space-y-2 rounded-md border p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <LoaderCircle className="size-4 animate-spin" />
              {progressLabel}
            </p>
            <Progress value={progressValue} />
            <p className="text-xs text-muted-foreground">
              Comparing full document content. This can take a few seconds.
            </p>
          </div>
        ) : null}

        {compareError ? (
          <p className="text-sm text-destructive" role="alert">
            {compareError}
          </p>
        ) : null}

        <Button type="submit" disabled={!canStart}>
          <Diff />
          {running ? "Comparing…" : "Start Comparison"}
        </Button>
      </form>

      {result ? (
        <FindingsTable
          comparison={result.comparison}
          findings={result.findings}
          reportStatus={result.reportStatus}
          onReportStatusChange={(status) => {
            setResult((prev) =>
              prev ? { ...prev, reportStatus: status } : prev
            );
          }}
          onRetry={
            result.comparison.status === "failed"
              ? () => {
                  void runComparison();
                }
              : undefined
          }
          retrying={running}
        />
      ) : null}
    </div>
  );
}

function DocumentSlot({
  label,
  selectId,
  selectedId,
  options,
  uploading,
  onSelect,
  onUpload,
}: {
  label: string;
  selectId: string;
  selectedId: string;
  options: DocumentRow[];
  uploading: boolean;
  onSelect: (id: string) => void;
  onUpload: (file: File | null) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <h2 className="text-sm font-medium">{label}</h2>

      <div className="space-y-2">
        <Label htmlFor={selectId}>Select existing</Label>
        <select
          id={selectId}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={uploading}
        >
          <option value="">Choose a ready comparison document…</option>
          {options.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${selectId}-file`}>Or upload new</Label>
        <Input
          id={`${selectId}-file`}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={uploading}
          onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
        />
        {uploading ? (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        ) : null}
      </div>
    </div>
  );
}
