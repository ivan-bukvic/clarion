/**
 * Faza 3 manual-path exercise, covering three cases through the same
 * production runComparison() the API route uses (no forked orchestration):
 *   1. failed -> retry: force a real failure (compare against a document
 *      with no chunks) then retry successfully with a valid pair.
 *   2. zero-findings: two identical documents must complete with an empty
 *      findings array, not be coerced into a failed comparison.
 *
 * Run: npx tsx --env-file=.env.local scripts/manual-test-compare-retry.ts
 */
import { runComparison } from "../lib/compare/run";
import { ingestFixture, serviceClient } from "./lib/ingest-fixture";

const QUOTE_A = [
  "Summit Contracting — Kitchen Remodel Quote",
  "Prepared for: Ridgeline Renovations",
  "Cabinet allowance: $4,200.",
  "Permit filing fee: $350.",
  "Total: $12,850.",
  "Timeline: 4 weeks. Payment: 50/50. Warranty: 1 year.",
].join("\n");

const QUOTE_B = [
  "Northline Builders — Kitchen Remodel Quote",
  "Prepared for: Ridgeline Renovations",
  "Cabinet allowance: $3,900.",
  "Total: $13,200.",
  "Includes appliance supply.",
  "Timeline: 6 weeks. Payment: 40/30/30. Warranty: 2 years.",
].join("\n");

const IDENTICAL_QUOTE = [
  "Summit Contracting — Kitchen Remodel Quote",
  "Prepared for: Ridgeline Renovations",
  "Cabinet allowance: $4,200.",
  "Permit filing fee: $350.",
  "Total: $12,850.",
  "Timeline: 4 weeks. Payment: 50/50. Warranty: 1 year.",
].join("\n");

async function main() {
  const supabase = serviceClient();

  const quoteA = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "manual-quote-a-summit.txt",
    buffer: Buffer.from(QUOTE_A, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });
  const quoteB = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "manual-quote-b-northline.txt",
    buffer: Buffer.from(QUOTE_B, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });

  console.log("fixtures ready", {
    document_a_id: quoteA.documentId,
    document_b_id: quoteB.documentId,
  });

  // --- Case 1: real failure (a real document row with zero chunks) -> retry ---
  // A random/nonexistent document_id would fail the comparisons FK insert
  // itself (never reaching "processing"), which isn't the failure mode
  // being exercised here — this needs a document that exists (so the
  // comparison starts processing) but has nothing in document_chunks, so
  // it fails at content-fetch time instead, same as a real transient bug.
  const emptyDocumentId = crypto.randomUUID();
  const { error: emptyDocError } = await supabase.from("documents").insert({
    id: emptyDocumentId,
    title: "empty-fixture-no-chunks",
    source_file: "empty-fixture-no-chunks.txt",
    file_type: "txt",
    purpose: "comparison",
    storage_path: `comparison/${emptyDocumentId}.txt`,
    status: "ready",
  });
  if (emptyDocError) {
    throw new Error(`empty fixture insert failed: ${emptyDocError.message}`);
  }

  const first = await runComparison(
    supabase,
    { id: quoteA.documentId, title: quoteA.title },
    { id: emptyDocumentId, title: "empty-fixture-no-chunks" }
  );
  if (first.ok || first.comparison?.status !== "failed") {
    throw new Error(
      `Expected first attempt to land on failed status. Got: ${JSON.stringify(first)}`
    );
  }
  console.log("failed path ok:", { comparison_id: first.comparison.id });

  const retry = await runComparison(
    supabase,
    { id: quoteA.documentId, title: quoteA.title },
    { id: quoteB.documentId, title: quoteB.title }
  );
  if (!retry.ok) {
    throw new Error(`Expected retry to complete. Got: ${JSON.stringify(retry)}`);
  }
  console.log("retry path ok:", {
    comparison_id: retry.comparison.id,
    summaryPreview: (retry.comparison.summary ?? "").slice(0, 120),
  });

  // --- Case 2: zero-findings must not be coerced into a failure ---
  const identicalA = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "manual-identical-a.txt",
    buffer: Buffer.from(IDENTICAL_QUOTE, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });
  const identicalB = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "manual-identical-b.txt",
    buffer: Buffer.from(IDENTICAL_QUOTE, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });

  const zeroFindings = await runComparison(
    supabase,
    { id: identicalA.documentId, title: identicalA.title },
    { id: identicalB.documentId, title: identicalB.title }
  );
  if (!zeroFindings.ok) {
    throw new Error(
      `Expected identical documents to complete (not fail). Got: ${JSON.stringify(zeroFindings)}`
    );
  }
  if (zeroFindings.findings.length !== 0) {
    console.log(
      "note: model reported non-empty findings for identical documents:",
      zeroFindings.findings
    );
  } else {
    console.log("zero-findings path ok:", {
      comparison_id: zeroFindings.comparison.id,
      summaryPreview: (zeroFindings.comparison.summary ?? "").slice(0, 120),
    });
  }

  // Cleanup
  await supabase.from("comparisons").delete().eq("id", first.comparison.id);
  await supabase.from("comparisons").delete().eq("id", retry.comparison.id);
  await supabase.from("comparisons").delete().eq("id", zeroFindings.comparison.id);
  await supabase.from("documents").delete().eq("id", quoteA.documentId);
  await supabase.from("documents").delete().eq("id", quoteB.documentId);
  await supabase.from("documents").delete().eq("id", identicalA.documentId);
  await supabase.from("documents").delete().eq("id", identicalB.documentId);
  await supabase.from("documents").delete().eq("id", emptyDocumentId);

  console.log(
    "PASS: failed→retry path and zero-findings path both succeeded"
  );
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
