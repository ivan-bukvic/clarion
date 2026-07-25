"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { Database, Tables } from "@/types/supabase";
import { FindingCategoryBadge } from "@/components/compare/finding-category-badge";
import { ReportDownloadButton } from "@/components/compare/report-download-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ComparisonRow = Tables<"comparisons">;
type FindingRow = Tables<"comparison_findings">;
type ReportStatus = Database["public"]["Enums"]["report_status"];

const POLL_INTERVAL_MS = 2500;

type FindingsTableProps = {
  comparison: ComparisonRow;
  findings: FindingRow[];
  reportStatus: ReportStatus;
  onRetry?: () => void;
  retrying?: boolean;
  onReportStatusChange?: (status: ReportStatus) => void;
};

export function FindingsTable({
  comparison,
  findings,
  reportStatus,
  onRetry,
  retrying = false,
  onReportStatusChange,
}: FindingsTableProps) {
  const [retryingReport, setRetryingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const onStatusChangeRef = useRef(onReportStatusChange);
  const activeComparisonIdRef = useRef(comparison.id);

  useEffect(() => {
    onStatusChangeRef.current = onReportStatusChange;
  }, [onReportStatusChange]);

  useEffect(() => {
    activeComparisonIdRef.current = comparison.id;
  }, [comparison.id]);

  // Poll while pending — allowed exception (FRONTEND_MASTER.md §10).
  // Status updates come from the interval callback, not sync setState in the
  // effect body (avoids react-hooks/set-state-in-effect).
  useEffect(() => {
    if (reportStatus !== "pending") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/compare/${comparison.id}/report/status`
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => ({}))) as {
          status?: ReportStatus;
        };
        if (
          json.status === "ready" ||
          json.status === "failed" ||
          json.status === "pending"
        ) {
          if (json.status !== "pending") {
            onStatusChangeRef.current?.(json.status);
          }
        }
      } catch {
        // Transient network errors — keep polling.
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [comparison.id, reportStatus]);

  if (comparison.status === "failed") {
    return (
      <div className="space-y-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-start gap-2.5">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <h2 className="text-sm font-medium text-destructive">
              Comparison failed
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The analysis could not be completed. You can retry with the same
              documents.
            </p>
          </div>
        </div>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry comparison"}
          </Button>
        ) : null}
      </div>
    );
  }

  async function resolveReportStatus(
    comparisonId: string
  ): Promise<ReportStatus | null> {
    try {
      const statusRes = await fetch(
        `/api/compare/${comparisonId}/report/status`
      );
      if (!statusRes.ok) return null;
      const statusJson = (await statusRes.json().catch(() => ({}))) as {
        status?: ReportStatus;
      };
      if (
        statusJson.status === "ready" ||
        statusJson.status === "failed" ||
        statusJson.status === "pending"
      ) {
        return statusJson.status;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function retryReport() {
    const startedForId = comparison.id;
    const isStale = () => activeComparisonIdRef.current !== startedForId;

    setReportError(null);
    setRetryingReport(true);
    // POST is synchronous — set status only from the final response,
    // and never apply it if the user has switched comparisons mid-flight.
    try {
      const res = await fetch(`/api/compare/${startedForId}/report`, {
        method: "POST",
      });
      if (isStale()) return;

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        report?: { status?: ReportStatus };
      };
      if (!res.ok || json.report?.status !== "ready") {
        setReportError(
          json.message ?? "Report generation failed. Please try again."
        );
        // Don't assume failed — a prior ready file (or race) may still win.
        const status = await resolveReportStatus(startedForId);
        if (isStale()) return;
        onStatusChangeRef.current?.(status ?? "failed");
        return;
      }
      onStatusChangeRef.current?.("ready");
    } catch {
      if (isStale()) return;
      setReportError("Report generation failed. Please try again.");
      // Same as the !ok branch: re-check before assuming failed.
      const status = await resolveReportStatus(startedForId);
      if (isStale()) return;
      onStatusChangeRef.current?.(status ?? "failed");
    } finally {
      if (!isStale()) {
        setRetryingReport(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {comparison.summary ?? "No summary available."}
          </p>
        </div>

        {reportStatus === "ready" ? (
          <ReportDownloadButton comparisonId={comparison.id} />
        ) : reportStatus === "pending" ? (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Generating report…
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void retryReport();
              }}
              disabled={retryingReport}
            >
              {retryingReport ? "Retrying…" : "Retry"}
            </Button>
            {reportError ? (
              <p className="text-sm text-destructive" role="alert">
                {reportError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <CircleAlert className="size-3.5 shrink-0" />
              Report generation failed
            </p>
            <p className="text-xs text-muted-foreground">
              Findings above are still available. You can retry report
              generation without re-running the comparison.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void retryReport();
              }}
              disabled={retryingReport}
            >
              {retryingReport ? "Retrying report…" : "Retry report"}
            </Button>
            {reportError ? (
              <p className="text-sm text-destructive" role="alert">
                {reportError}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">
          Findings ({findings.length})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Document A</TableHead>
              <TableHead>Document B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((finding) => (
              <TableRow key={finding.id}>
                <TableCell className="align-top whitespace-normal">
                  <FindingCategoryBadge category={finding.category} />
                </TableCell>
                <TableCell className="max-w-md align-top whitespace-normal text-sm">
                  {finding.description}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm text-muted-foreground">
                  {finding.source_a_ref ?? "—"}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm text-muted-foreground">
                  {finding.source_b_ref ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
