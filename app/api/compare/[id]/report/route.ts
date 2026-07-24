import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  DOCX_CONTENT_TYPE,
  generateComparisonReport,
  REPORTS_BUCKET,
} from "@/lib/compare/generate-report";
import {
  authorizeReportRequest,
  type ReportRouteContext,
} from "@/lib/compare/report-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type ReportErrorCode = "DOCX_GENERATION_FAILED";

function errorResponse(
  code: ReportErrorCode,
  message: string,
  status: number
) {
  return NextResponse.json({ code, message }, { status });
}

export async function GET(_request: Request, context: ReportRouteContext) {
  const auth = await authorizeReportRequest(context);
  if (!auth.ok) return auth.response;

  const { comparisonId } = auth;
  const supabase = createServiceRoleClient();

  try {
    const { data: report, error: reportError } = await supabase
      .from("generated_reports")
      .select("file_url, status")
      .eq("comparison_id", comparisonId)
      .maybeSingle();

    if (reportError) {
      console.error("DOCX_GENERATION_FAILED", reportError);
      return errorResponse(
        "DOCX_GENERATION_FAILED",
        "Could not look up the generated report.",
        500
      );
    }

    if (!report || report.status !== "ready" || !report.file_url) {
      return errorResponse(
        "DOCX_GENERATION_FAILED",
        "Report not available yet.",
        404
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(REPORTS_BUCKET)
      .download(report.file_url);

    if (downloadError || !file) {
      console.error("DOCX_GENERATION_FAILED", downloadError);
      return errorResponse(
        "DOCX_GENERATION_FAILED",
        "Could not download the report file.",
        500
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Disposition":
          'attachment; filename="comparison-report.docx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("DOCX_GENERATION_FAILED", err);
    return errorResponse(
      "DOCX_GENERATION_FAILED",
      "Could not download the report. Please try again.",
      500
    );
  }
}

export async function POST(_request: Request, context: ReportRouteContext) {
  const auth = await authorizeReportRequest(context);
  if (!auth.ok) return auth.response;

  const { comparisonId } = auth;
  const supabase = createServiceRoleClient();

  try {
    const { data: comparison, error: comparisonError } = await supabase
      .from("comparisons")
      .select("id, status, summary, document_a_id, document_b_id")
      .eq("id", comparisonId)
      .maybeSingle();

    if (comparisonError) {
      console.error("DOCX_GENERATION_FAILED", comparisonError);
      return errorResponse(
        "DOCX_GENERATION_FAILED",
        "Could not load the comparison. Please try again.",
        500
      );
    }

    if (!comparison) {
      return NextResponse.json(
        { message: "Comparison not found." },
        { status: 404 }
      );
    }

    if (comparison.status !== "completed") {
      return NextResponse.json(
        {
          message:
            "Report can only be generated for a completed comparison.",
        },
        { status: 400 }
      );
    }

    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", [comparison.document_a_id, comparison.document_b_id]);

    if (docsError || !docs || docs.length < 2) {
      console.error("DOCX_GENERATION_FAILED", docsError);
      return errorResponse(
        "DOCX_GENERATION_FAILED",
        "Could not load document titles for the report.",
        500
      );
    }

    const titleA =
      docs.find((d) => d.id === comparison.document_a_id)?.title ??
      "Document A";
    const titleB =
      docs.find((d) => d.id === comparison.document_b_id)?.title ??
      "Document B";

    // Mark pending so a concurrent poller doesn't show stale failed/ready.
    // Do not touch created_at — keep the original pending-insert timestamp.
    const { error: pendingError } = await supabase
      .from("generated_reports")
      .upsert(
        {
          comparison_id: comparisonId,
          status: "pending",
          error_message: null,
        },
        { onConflict: "comparison_id" }
      );
    if (pendingError) {
      console.error("DOCX_GENERATION_FAILED", {
        comparison_id: comparisonId,
        message: "Failed to mark report pending before regenerate",
        error: pendingError,
      });
    }

    const result = await generateComparisonReport(supabase, {
      ...comparison,
      document_a_title: titleA,
      document_b_title: titleB,
    });
    if (!result.ok) {
      return errorResponse("DOCX_GENERATION_FAILED", result.message, 500);
    }

    return NextResponse.json({
      report: { comparison_id: comparisonId, status: "ready" as const },
    });
  } catch (err) {
    console.error("DOCX_GENERATION_FAILED", err);
    return errorResponse(
      "DOCX_GENERATION_FAILED",
      "Report generation failed unexpectedly. Please try again.",
      500
    );
  }
}
