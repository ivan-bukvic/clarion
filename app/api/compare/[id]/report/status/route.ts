import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  authorizeReportRequest,
  type ReportRouteContext,
} from "@/lib/compare/report-auth";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

type ReportStatus = Database["public"]["Enums"]["report_status"];

/**
 * Lightweight status poll for async DOCX generation (FRONTEND_MASTER.md §10).
 * Returns pending | ready | failed. Missing row → failed so the UI shows Retry.
 */
export async function GET(_request: Request, context: ReportRouteContext) {
  const auth = await authorizeReportRequest(context);
  if (!auth.ok) return auth.response;

  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from("generated_reports")
      .select("status")
      .eq("comparison_id", auth.comparisonId)
      .maybeSingle();

    if (error) {
      console.error("DOCX_GENERATION_FAILED", error);
      return NextResponse.json(
        {
          code: "DOCX_GENERATION_FAILED",
          message: "Could not look up report status.",
        },
        { status: 500 }
      );
    }

    const status: ReportStatus = data?.status ?? "failed";
    return NextResponse.json({ status });
  } catch (err) {
    console.error("DOCX_GENERATION_FAILED", err);
    return NextResponse.json(
      {
        code: "DOCX_GENERATION_FAILED",
        message: "Could not look up report status.",
      },
      { status: 500 }
    );
  }
}
