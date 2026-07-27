/**
 * Verifies the Faza 6 DOMMatrix fix:
 * - parseDocument('txt') must not load pdf-parse
 * - parseDocument('pdf') must succeed under Node (same runtime as next start)
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-parse-lazy-pdf.ts
 */
import { parseDocument } from "../lib/documents/parse";

function buildMinimalPdf(
  lines: { text: string; x: number; y: number; size: number }[]
): Buffer {
  const contentLines = ["BT"];
  for (const line of lines) {
    contentLines.push(`/F1 ${line.size} Tf`);
    contentLines.push(`${line.x} ${line.y} Td`);
    contentLines.push(`(${line.text.replace(/[()\\]/g, "\\$&")}) Tj`);
    contentLines.push("0 -20 Td");
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf-8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf-8");
}

async function main() {
  const txt = await parseDocument(
    Buffer.from(
      "Ridgeline Renovations — TXT parse check\nPermit number: RR-2026-0142.\n",
      "utf-8"
    ),
    "txt"
  );
  if (!txt.text.includes("RR-2026-0142")) {
    throw new Error("TXT parse failed: expected permit number missing");
  }
  console.log("PASS: parseDocument(txt) — no pdf-parse required");

  const pdfBuffer = buildMinimalPdf([
    { text: "Clarion PDF lazy-load check", x: 72, y: 720, size: 18 },
    { text: "DOMMatrix must not crash this path.", x: 72, y: 690, size: 12 },
  ]);
  const pdf = await parseDocument(pdfBuffer, "pdf");
  if (!pdf.text.includes("Clarion PDF lazy-load check")) {
    throw new Error(`PDF parse failed: got ${JSON.stringify(pdf.text)}`);
  }
  console.log("PASS: parseDocument(pdf) — dynamic pdf-parse under Node");
  console.log("preview:", pdf.text.trim().slice(0, 120));
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
