import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { anthropic, CLAUDE_MODEL } from "@/lib/llm/client";
import { fetchFullDocumentContent } from "@/lib/compare/full-content";
import {
  buildComparisonMessages,
  RECORD_COMPARISON_TOOL,
  RECORD_COMPARISON_TOOL_NAME,
} from "@/lib/compare/prompt";
import { parseComparisonOutput } from "@/lib/compare/findings";

type ComparisonRow = Database["public"]["Tables"]["comparisons"]["Row"];
type FindingRow = Database["public"]["Tables"]["comparison_findings"]["Row"];
type DocumentRef = { id: string; title: string };
type ReportStatus = Database["public"]["Enums"]["report_status"];

export type CompareRunResult =
  | {
      ok: true;
      comparison: ComparisonRow;
      findings: FindingRow[];
      report: { status: ReportStatus };
    }
  | {
      ok: false;
      comparison: ComparisonRow | null;
      findings: FindingRow[];
      message: string;
      report: { status: ReportStatus };
    };

/**
 * Shared insert -> analyze -> save -> complete/fail orchestration for a
 * comparison run. Used by app/api/compare/route.ts and the compare smoke
 * scripts so this sequence can't drift between them (Faza 1/2 review
 * lesson — see scripts/lib/ingest-fixture.ts for the same pattern applied
 * to ingestion).
 *
 * Report DOCX generation is NOT awaited here — the API route schedules it
 * via after() so the client gets findings as soon as the comparison is
 * completed. This function only inserts a generated_reports row with
 * status='pending' so the UI can poll for ready/failed.
 *
 * Callers are responsible for validating documentA/documentB (existence,
 * purpose = comparison, status = ready) before calling this — that's an
 * HTTP-shaped 400 concern, not part of the run itself.
 */
export async function runComparison(
  supabase: SupabaseClient<Database>,
  documentA: DocumentRef,
  documentB: DocumentRef
): Promise<CompareRunResult> {
  const { data: comparison, error: insertError } = await supabase
    .from("comparisons")
    .insert({
      document_a_id: documentA.id,
      document_b_id: documentB.id,
      status: "processing",
    })
    .select()
    .single();

  if (insertError || !comparison) {
    console.error("COMPARISON_GENERATION_FAILED", insertError);
    return {
      ok: false,
      comparison: null,
      findings: [],
      message: "Could not start the comparison. Please try again.",
      report: { status: "failed" },
    };
  }

  const comparisonId = comparison.id;

  try {
    const [contentA, contentB] = await Promise.all([
      fetchFullDocumentContent(supabase, documentA),
      fetchFullDocumentContent(supabase, documentB),
    ]);

    const { system, messages } = buildComparisonMessages(
      contentA.title,
      contentA.sections,
      contentB.title,
      contentB.sections
    );

    let toolInput: unknown;
    try {
      // 8192 leaves headroom for dense quote pairs with many findings.
      // Known limitation (demo scope): very long real-world documents with
      // dozens of line-item differences could still hit max_tokens and fail
      // the run — accepted residual risk for short Ridgeline demo quotes;
      // chunked/retrieval-based comparison (README real-client note) would
      // be needed before raising this further for production-scale docs.
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system,
        messages,
        tools: [RECORD_COMPARISON_TOOL],
        tool_choice: {
          type: "tool",
          name: RECORD_COMPARISON_TOOL_NAME,
        },
      });

      if (response.stop_reason === "max_tokens") {
        throw new Error(
          "COMPARISON_GENERATION_FAILED: LLM output truncated (stop_reason=max_tokens)"
        );
      }

      const toolBlock = response.content.find(
        (block) =>
          block.type === "tool_use" && block.name === RECORD_COMPARISON_TOOL_NAME
      );

      if (!toolBlock || toolBlock.type !== "tool_use") {
        throw new Error("missing record_comparison tool_use block");
      }

      toolInput = toolBlock.input;
    } catch (err) {
      console.error("COMPARISON_GENERATION_FAILED", err);
      return finishFailed(
        supabase,
        comparisonId,
        "Could not analyze the documents. Please try again."
      );
    }

    let parsedOutput;
    try {
      parsedOutput = parseComparisonOutput(toolInput);
    } catch (err) {
      console.error("COMPARISON_GENERATION_FAILED", err);
      return finishFailed(
        supabase,
        comparisonId,
        "Could not parse the comparison results. Please try again."
      );
    }

    const findingRows = parsedOutput.findings.map((finding) => ({
      comparison_id: comparisonId,
      category: finding.category,
      description: finding.description,
      source_a_ref: finding.source_a_ref,
      source_b_ref: finding.source_b_ref,
    }));

    // findingRows may legitimately be empty — "no material differences"
    // is a valid outcome, not a failure (see lib/compare/findings.ts).
    let findings: FindingRow[] = [];
    if (findingRows.length > 0) {
      const { data: insertedFindings, error: findingsError } = await supabase
        .from("comparison_findings")
        .insert(findingRows)
        .select();

      if (findingsError || !insertedFindings) {
        console.error("COMPARISON_GENERATION_FAILED", findingsError);
        return finishFailed(
          supabase,
          comparisonId,
          "Could not save comparison findings. Please try again."
        );
      }
      findings = insertedFindings;
    }

    const { data: completedRow, error: completeError } = await supabase
      .from("comparisons")
      .update({
        summary: parsedOutput.summary,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", comparisonId)
      .select()
      .single();

    if (completeError || !completedRow) {
      console.error("COMPARISON_GENERATION_FAILED", completeError);
      return finishFailed(
        supabase,
        comparisonId,
        "Comparison findings were saved but status update failed. Please try again.",
        findings
      );
    }

    // Isolated from the outer try/catch: a throw here must never mark the
    // already-completed comparison as failed.
    let reportStatus: ReportStatus = "failed";
    try {
      const { error: pendingError } = await supabase
        .from("generated_reports")
        .upsert(
          {
            comparison_id: comparisonId,
            status: "pending",
            file_url: null,
            error_message: null,
          },
          { onConflict: "comparison_id" }
        );

      if (pendingError) {
        console.error(
          "Failed to insert pending generated_reports row (non-fatal)",
          pendingError
        );
      } else {
        reportStatus = "pending";
      }
    } catch (pendingErr) {
      console.error(
        "Failed to insert pending generated_reports row (non-fatal)",
        pendingErr
      );
    }

    return {
      ok: true,
      comparison: completedRow,
      findings,
      report: { status: reportStatus },
    };
  } catch (err) {
    console.error("COMPARISON_GENERATION_FAILED", err);
    return finishFailed(
      supabase,
      comparisonId,
      "Comparison failed unexpectedly. Please try again."
    );
  }
}

async function markComparisonFailed(
  supabase: SupabaseClient<Database>,
  comparisonId: string
): Promise<ComparisonRow | null> {
  const { data, error } = await supabase
    .from("comparisons")
    .update({ status: "failed" })
    .eq("id", comparisonId)
    .select()
    .single();

  if (error) {
    console.error(
      "Could not mark comparison failed after generation error",
      error
    );
    return null;
  }
  return data;
}

/**
 * Mark the comparison failed and return it, along with whatever findings
 * actually made it into comparison_findings before the failure — checked
 * against the DB rather than trusting in-memory state, so a caller never
 * reports findings: [] when rows genuinely exist for this comparison_id.
 */
async function finishFailed(
  supabase: SupabaseClient<Database>,
  comparisonId: string,
  message: string,
  knownFindings: FindingRow[] = []
): Promise<CompareRunResult> {
  const failed = await markComparisonFailed(supabase, comparisonId);

  let findings = knownFindings;
  if (findings.length === 0) {
    const { data, error } = await supabase
      .from("comparison_findings")
      .select()
      .eq("comparison_id", comparisonId);
    if (!error && data && data.length > 0) {
      findings = data;
    }
  }

  return {
    ok: false,
    comparison: failed,
    findings,
    message,
    report: { status: "failed" },
  };
}
