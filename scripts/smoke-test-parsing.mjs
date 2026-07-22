// Faza 0 sanity check for the document-parsing stack (pdf-parse, mammoth, docx).
// Builds a tiny DOCX and a tiny PDF in memory, round-trips them through the
// same libraries lib/documents/parse.ts uses, and fails loudly if the
// extracted text doesn't come back out. No fixture files needed/committed.
//
// Run: node scripts/smoke-test-parsing.mjs

import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const EXPECTED_TITLE = "Clarion smoke test";
const EXPECTED_PARAGRAPH =
  "This paragraph confirms mammoth extraction round-trips through the docx library end to end.";

async function testDocx() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: EXPECTED_TITLE, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: EXPECTED_PARAGRAPH })],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const result = await mammoth.extractRawText({ buffer });

  const ok =
    result.value.includes(EXPECTED_TITLE) &&
    result.value.includes(EXPECTED_PARAGRAPH);

  console.log("--- docx -> mammoth ---");
  console.log(result.value.trim());
  console.log(ok ? "PASS" : "FAIL");
  return ok;
}

// Minimal hand-built single-page PDF (no external PDF library needed) — one
// content stream with two Tj text-showing operations.
function buildMinimalPdf(lines) {
  const contentStream = lines
    .map(
      ({ text, x, y, size }) =>
        `BT /F1 ${size} Tf ${x} ${y} Td (${text.replace(/([()\\])/g, "\\$1")}) Tj ET`
    )
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(contentStream, "utf-8")} >>\nstream\n${contentStream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

async function testPdf() {
  const pdfBuffer = buildMinimalPdf([
    { text: "Clarion PDF smoke test", x: 72, y: 720, size: 24 },
    {
      text: "This paragraph confirms pdf-parse extraction works end to end.",
      x: 72,
      y: 680,
      size: 12,
    },
  ]);

  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();

  const ok =
    result.text.includes("Clarion PDF smoke test") &&
    result.text.includes(
      "This paragraph confirms pdf-parse extraction works end to end."
    );

  console.log("--- pdf-parse ---");
  console.log(result.text.trim());
  console.log(ok ? "PASS" : "FAIL");
  return ok;
}

const [docxOk, pdfOk] = await Promise.all([testDocx(), testPdf()]);

if (!docxOk || !pdfOk) {
  console.error("\nSmoke test FAILED");
  process.exit(1);
}

console.log("\nAll parsing smoke tests PASS");
