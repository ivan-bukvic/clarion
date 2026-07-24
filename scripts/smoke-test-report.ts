/**
 * Faza 4 verification (async after() report path):
 * 1. Run Ridgeline-style comparison → assert report.status=pending tracking row
 * 2. Explicitly generate DOCX (mirrors what after() does in the API route)
 * 3. Download .docx locally and open it (Word / default app)
 * 4. Confirm failed DOCX generation leaves completed comparison + findings intact
 *
 * Run: npx tsx --env-file=.env.local scripts/smoke-test-report.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { runComparison } from "../lib/compare/run";
import {
  generateComparisonReport,
  REPORTS_BUCKET,
} from "../lib/compare/generate-report";
import { ingestFixture, serviceClient } from "./lib/ingest-fixture";

const QUOTE_A = [
  "Summit Contracting — Kitchen Remodel Quote",
  "Prepared for: Ridgeline Renovations",
  "Project: 184 Maple Street kitchen remodel",
  "",
  "Pricing",
  "Cabinet allowance: $4,200.",
  "Countertop allowance: $1,800 (quartz).",
  "Permit filing fee: $350.",
  "Labor: $6,500.",
  "Total project estimate: $12,850.",
  "",
  "Scope",
  "Includes demolition, cabinet install, quartz countertops, and backsplash.",
  "Does not include appliance supply.",
  "",
  "Terms",
  "Timeline: 4 weeks from deposit.",
  "Payment: 50% deposit, 50% on completion.",
  "Warranty: 1 year labor warranty.",
].join("\n");

const QUOTE_B = [
  "Northline Builders — Kitchen Remodel Quote",
  "Prepared for: Ridgeline Renovations",
  "Project: 184 Maple Street kitchen remodel",
  "",
  "Pricing",
  "Cabinet allowance: $3,900.",
  "Countertop allowance: $2,100 (quartz).",
  "Labor: $7,200.",
  "Total project estimate: $13,200.",
  "",
  "Scope",
  "Includes demolition, cabinet install, quartz countertops, backsplash, and appliance supply.",
  "",
  "Terms",
  "Timeline: 6 weeks from deposit.",
  "Payment: 40% deposit, 30% at rough-in, 30% on completion.",
  "Warranty: 2 year labor warranty.",
].join("\n");

async function main() {
  const supabase = serviceClient();

  const quoteA = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "report-quote-a-summit.txt",
    buffer: Buffer.from(QUOTE_A, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });
  const quoteB = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "report-quote-b-northline.txt",
    buffer: Buffer.from(QUOTE_B, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });

  const result = await runComparison(
    supabase,
    { id: quoteA.documentId, title: quoteA.title },
    { id: quoteB.documentId, title: quoteB.title }
  );

  if (!result.ok) {
    throw new Error(`Comparison failed: ${result.message}`);
  }
  if (result.report.status !== "pending") {
    throw new Error(
      `Expected report.status=pending after comparison, got ${result.report.status}`
    );
  }
  if (result.findings.length < 1) {
    throw new Error("Expected findings for Ridgeline quote pair");
  }

  const comparisonId = result.comparison.id;
  console.log("comparison completed:", {
    comparison_id: comparisonId,
    findings: result.findings.length,
    report_status: result.report.status,
  });

  const { data: pendingRow, error: pendingError } = await supabase
    .from("generated_reports")
    .select("status, file_url")
    .eq("comparison_id", comparisonId)
    .single();
  if (pendingError || !pendingRow || pendingRow.status !== "pending") {
    throw new Error(
      `Expected pending generated_reports row: ${JSON.stringify({
        pendingError,
        pendingRow,
      })}`
    );
  }

  // Mirror what after() does in POST /api/compare.
  const generated = await generateComparisonReport(supabase, {
    ...result.comparison,
    document_a_title: quoteA.title,
    document_b_title: quoteB.title,
  });
  if (!generated.ok) {
    throw new Error(`Report generation failed: ${generated.message}`);
  }

  const { data: reportRow, error: reportError } = await supabase
    .from("generated_reports")
    .select("file_url, status")
    .eq("comparison_id", comparisonId)
    .single();
  if (
    reportError ||
    !reportRow ||
    reportRow.status !== "ready" ||
    !reportRow.file_url
  ) {
    throw new Error(
      `generated_reports not ready: ${JSON.stringify({ reportError, reportRow })}`
    );
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(REPORTS_BUCKET)
    .download(reportRow.file_url);
  if (downloadError || !file) {
    throw new Error(`storage download failed: ${downloadError?.message}`);
  }

  const outDir = resolve(process.cwd(), "tmp");
  mkdirSync(outDir, { recursive: true });
  // Unique name so an already-open Word window doesn't EBUSY the write.
  const outPath = resolve(
    outDir,
    `ridgeline-comparison-report-${Date.now()}.docx`
  );
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength < 1000) {
    throw new Error(`DOCX too small (${bytes.byteLength} bytes)`);
  }
  writeFileSync(outPath, bytes);
  console.log("wrote report:", outPath, `(${bytes.byteLength} bytes)`);

  // Open in default Word / associated app (Windows).
  try {
    execFileSync("cmd", ["/c", "start", "", outPath], {
      stdio: "ignore",
      windowsHide: true,
    });
    console.log("opened report in default application");
  } catch (err) {
    console.warn("could not auto-open report — open manually:", outPath, err);
  }

  // --- Checklist #8: failed DOCX must not hide completed comparison ---
  // Exercise the "status !== completed" branch with a real row (not a
  // missing-id 404 path), while the completed comparison stays untouched.
  const { data: nonCompleted, error: nonCompletedError } = await supabase
    .from("comparisons")
    .insert({
      document_a_id: quoteA.documentId,
      document_b_id: quoteB.documentId,
      status: "failed",
    })
    .select("id, status, summary, document_a_id, document_b_id")
    .single();
  if (nonCompletedError || !nonCompleted) {
    throw new Error(
      `Could not seed non-completed comparison: ${nonCompletedError?.message}`
    );
  }

  const forcedFail = await generateComparisonReport(supabase, {
    ...nonCompleted,
    document_a_title: quoteA.title,
    document_b_title: quoteB.title,
  });
  if (forcedFail.ok) {
    throw new Error(
      "Expected generateComparisonReport to fail for status=failed"
    );
  }
  if (
    !forcedFail.message.includes(
      "Report can only be generated for a completed comparison"
    )
  ) {
    throw new Error(
      `Expected non-completed status message, got: ${forcedFail.message}`
    );
  }

  const { data: stillCompleted, error: stillError } = await supabase
    .from("comparisons")
    .select("id, status, summary")
    .eq("id", comparisonId)
    .single();
  if (stillError || !stillCompleted || stillCompleted.status !== "completed") {
    throw new Error(
      `Completed comparison was disturbed after DOCX failure: ${JSON.stringify({
        stillError,
        stillCompleted,
      })}`
    );
  }

  const { data: stillFindings, error: findingsError } = await supabase
    .from("comparison_findings")
    .select("id")
    .eq("comparison_id", comparisonId);
  if (findingsError || !stillFindings || stillFindings.length < 1) {
    throw new Error("Findings missing after DOCX failure simulation");
  }

  // Retry report generation succeeds for the completed comparison.
  const retry = await generateComparisonReport(supabase, {
    ...result.comparison,
    document_a_title: quoteA.title,
    document_b_title: quoteB.title,
  });
  if (!retry.ok) {
    throw new Error(`Retry report failed: ${retry.message}`);
  }

  console.log("checklist #8 ok: completed comparison + findings survived DOCX failure");
  console.log("checklist #9–10 ok: report written and opened:", outPath);

  // Keep the .docx for visual review; clean DB fixtures.
  await supabase.from("comparisons").delete().eq("id", nonCompleted.id);
  await supabase.from("comparisons").delete().eq("id", comparisonId);
  await supabase.from("documents").delete().eq("id", quoteA.documentId);
  await supabase.from("documents").delete().eq("id", quoteB.documentId);
  // Best-effort storage cleanup
  await supabase.storage.from(REPORTS_BUCKET).remove([reportRow.file_url]);

  console.log("PASS: Faza 4 report smoke succeeded");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
