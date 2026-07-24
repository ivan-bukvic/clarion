import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  generateComparisonReport,
  type ComparisonForReport,
} from "@/lib/compare/generate-report";

/**
 * Hook scheduled via after() when a comparison reaches status = 'completed'.
 * Generates the DOCX report, uploads it, and upserts generated_reports to
 * ready/failed. Failures are returned (never thrown) so a killed after()
 * task never surfaces as an unhandled rejection.
 */
export async function triggerReportGeneration(
  supabase: SupabaseClient<Database>,
  comparison: ComparisonForReport
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await generateComparisonReport(supabase, comparison);
  if (!result.ok) {
    console.error("DOCX_GENERATION_FAILED", {
      comparison_id: comparison.id,
      message: result.message,
    });
    return { ok: false, message: result.message };
  }
  return { ok: true };
}
