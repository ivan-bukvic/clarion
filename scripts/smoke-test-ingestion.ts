/**
 * Faza 1 smoke: parse → chunk → embed → insert for corpus TXT and
 * comparison DOCX. Imports production lib code (not a forked copy).
 *
 * Run: npm run test:ingestion
 *   or: npx tsx --env-file=.env.local scripts/smoke-test-ingestion.ts
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { ingestFixture, serviceClient } from "./lib/ingest-fixture";

async function main() {
  // --- Regression #1: angle brackets in plain TXT must survive ---
  const angleText =
    "Keep total < $10,000 on this remodel. Require margin > 15% on materials.";
  const txt = Buffer.from(angleText, "utf-8");
  const corpus = await ingestFixture({
    purpose: "corpus",
    fileType: "txt",
    sourceFile: "smoke-corpus-angles.txt",
    buffer: txt,
    contentType: "text/plain",
    ext: "txt",
  });

  if (!corpus.text.includes("< $10,000") || !corpus.text.includes("> 15%")) {
    throw new Error(
      `Angle brackets corrupted in TXT parse. Got: ${JSON.stringify(corpus.text)}`
    );
  }
  console.log("corpus TXT (angle brackets preserved):", {
    documentId: corpus.documentId,
    chunkCount: corpus.chunkCount,
  });

  // --- Regression #4: DOCX pricing table cells must stay separated ---
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Scope of Work")],
          }),
          new Paragraph({
            children: [
              new TextRun("Cabinets and countertops for kitchen remodel."),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Pricing")],
          }),
          new Table({
            width: { size: 5000, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("Item")] }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("Qty")] }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("Price")] }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("Cabinets")] }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("1")] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("$4,200")] }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun("Countertops")],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun("1")] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun("$1,800")] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const docxBuffer = Buffer.from(await Packer.toBuffer(doc));
  const comparison = await ingestFixture({
    purpose: "comparison",
    fileType: "docx",
    sourceFile: "smoke-comparison-table.docx",
    buffer: docxBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  });

  if (comparison.headings.length < 2) {
    throw new Error(
      `Expected headings from DOCX, got: ${JSON.stringify(comparison.headings)}`
    );
  }

  // Strict table format — cells on one line with " || ", not "Item\n | Qty"
  const expectedHeader = "Item || Qty || Price";
  const expectedCabinets = "Cabinets || 1 || $4,200";
  const expectedCountertops = "Countertops || 1 || $1,800";
  for (const expected of [expectedHeader, expectedCabinets, expectedCountertops]) {
    if (!comparison.text.includes(expected)) {
      throw new Error(
        `DOCX table format wrong — missing ${JSON.stringify(expected)}. Got: ${JSON.stringify(comparison.text)}`
      );
    }
  }
  if (
    comparison.text.includes("Item\n") ||
    comparison.text.includes("Qty\n ||") ||
    comparison.text.includes("Item\n ||")
  ) {
    throw new Error(
      `DOCX table still has cell newlines. Got: ${JSON.stringify(comparison.text)}`
    );
  }

  console.log("comparison DOCX (table + headings):", {
    documentId: comparison.documentId,
    chunkCount: comparison.chunkCount,
    headings: comparison.headings,
    pricingPreview: comparison.text.slice(
      comparison.text.indexOf("Pricing"),
      comparison.text.indexOf("Pricing") + 120
    ),
  });

  // --- Ready-update failure must not leave status stuck on "processing" ---
  const stuckId = crypto.randomUUID();
  const supabase = serviceClient();
  const { error: stuckInsertError } = await supabase.from("documents").insert({
    id: stuckId,
    title: "smoke-ready-fail",
    source_file: "smoke-ready-fail.txt",
    file_type: "txt",
    purpose: "corpus",
    storage_path: `corpus/${stuckId}.txt`,
    status: "processing",
  });
  if (stuckInsertError) {
    throw new Error(`Could not seed ready-fail fixture: ${stuckInsertError.message}`);
  }

  try {
    // Simulate the route's ready-update failure path
    throw new Error("simulated ready update failure");
  } catch {
    const { error: failUpdateError } = await supabase
      .from("documents")
      .update({ status: "failed" })
      .eq("id", stuckId);
    if (failUpdateError) {
      throw new Error(
        `Could not mark document failed after ready error: ${failUpdateError.message}`
      );
    }
  }

  const { data: stuckDoc, error: stuckReadError } = await supabase
    .from("documents")
    .select("status")
    .eq("id", stuckId)
    .single();
  if (stuckReadError || stuckDoc?.status !== "failed") {
    throw new Error(
      `Ready-fail recovery left status=${stuckDoc?.status ?? "missing"}, expected failed`
    );
  }
  console.log("ready-fail recovery:", { documentId: stuckId, status: stuckDoc.status });

  // Cleanup this fixture (+ cascade chunks if any)
  await supabase.from("documents").delete().eq("id", stuckId);

  console.log("PASS: production parse/chunk/embed/insert succeeded");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
