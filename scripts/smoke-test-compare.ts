/**
 * Faza 3 smoke: full-document comparison against two Ridgeline-style quotes.
 * Imports production lib code (not a forked copy) — including the shared
 * runComparison() orchestration used by app/api/compare/route.ts, so this
 * test and production can't drift apart.
 *
 * Run: npm run test:compare
 *   or: npx tsx --env-file=.env.local scripts/smoke-test-compare.ts
 */
import { runComparison } from "../lib/compare/run";
import { Constants } from "../types/supabase";
import { ingestFixture, serviceClient } from "./lib/ingest-fixture";

const VALID_CATEGORIES = new Set(Constants.public.Enums.finding_category);

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
  const quoteA = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "quote-a-summit-contracting.txt",
    buffer: Buffer.from(QUOTE_A, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });
  const quoteB = await ingestFixture({
    purpose: "comparison",
    fileType: "txt",
    sourceFile: "quote-b-northline-builders.txt",
    buffer: Buffer.from(QUOTE_B, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });

  console.log("ingested comparison fixtures:", {
    document_a_id: quoteA.documentId,
    document_b_id: quoteB.documentId,
  });

  const supabase = serviceClient();

  // Seed a prior failed run so retry creates a new completed comparison
  // (same document pair) — covers failed→retry path from Faza 3 checklist #11.
  const { data: failedSeed, error: failedSeedError } = await supabase
    .from("comparisons")
    .insert({
      document_a_id: quoteA.documentId,
      document_b_id: quoteB.documentId,
      status: "failed",
    })
    .select("id, status")
    .single();
  if (failedSeedError || !failedSeed) {
    throw new Error(`failed seed insert failed: ${failedSeedError?.message}`);
  }
  console.log("seeded failed comparison for retry path:", failedSeed);

  const result = await runComparison(
    supabase,
    { id: quoteA.documentId, title: quoteA.title },
    { id: quoteB.documentId, title: quoteB.title }
  );

  if (!result.ok) {
    throw new Error(
      `Expected completed, got failed: ${result.message} — comparison=${JSON.stringify(result.comparison)}`
    );
  }
  if (!result.comparison.summary || result.comparison.summary.trim().length === 0) {
    throw new Error("Expected non-empty summary");
  }
  if (result.findings.length < 1) {
    throw new Error(`Expected findings, got ${result.findings.length}`);
  }
  const categories = result.findings.map((f) => f.category);
  for (const category of categories) {
    if (!VALID_CATEGORIES.has(category as (typeof Constants.public.Enums.finding_category)[number])) {
      throw new Error(`Unexpected finding category: ${category}`);
    }
  }

  // Expect at least one of the intentional differences to surface as a
  // categorized finding (price / missing permit / scope / terms).
  const categorySet = new Set(categories);
  const hasMaterialCategory =
    categorySet.has("price_difference") ||
    categorySet.has("missing_item") ||
    categorySet.has("scope_difference") ||
    categorySet.has("term_difference");
  if (!hasMaterialCategory) {
    throw new Error(
      `Expected at least one material category. Got: ${JSON.stringify(categories)}`
    );
  }

  console.log("comparison result:", {
    comparisonId: result.comparison.id,
    findingsCount: result.findings.length,
    categories,
    summaryPreview: result.comparison.summary.slice(0, 160),
  });

  // Cleanup fixtures (findings cascade from comparisons; chunks cascade from documents)
  await supabase.from("comparisons").delete().eq("id", failedSeed.id);
  await supabase.from("comparisons").delete().eq("id", result.comparison.id);
  await supabase.from("documents").delete().eq("id", quoteA.documentId);
  await supabase.from("documents").delete().eq("id", quoteB.documentId);

  console.log("PASS: comparison analysis + failed→retry path succeeded");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
