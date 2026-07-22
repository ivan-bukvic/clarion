/**
 * Direct verification of DOCX table → plain text (no DB).
 * Covers: plain cells, <br> inside a cell, literal "|" in cell content.
 * Run: npx tsx scripts/verify-docx-table.ts
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
import { parseDocument } from "../lib/documents/parse";

function cell(children: Paragraph[]) {
  return new TableCell({ children });
}

function plainCell(text: string) {
  return cell([new Paragraph({ children: [new TextRun(text)] })]);
}

async function main() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Pricing")],
          }),
          new Table({
            width: { size: 6000, type: WidthType.DXA },
            rows: [
              // Plain happy-path header
              new TableRow({
                children: ["Item", "Qty", "Price"].map(plainCell),
              }),
              // Plain happy-path data
              new TableRow({
                children: ["Cabinets", "1", "$4,200"].map(plainCell),
              }),
              // <br> inside a cell via TextRun break
              new TableRow({
                children: [
                  cell([
                    new Paragraph({
                      children: [
                        new TextRun("Line A"),
                        new TextRun({ break: 1 }),
                        new TextRun("Line B"),
                      ],
                    }),
                  ]),
                  plainCell("2"),
                  plainCell("$100"),
                ],
              }),
              // Literal "|" in cell content must stay distinguishable from " || "
              new TableRow({
                children: [
                  plainCell("Split cost"),
                  plainCell("50% | 50%"),
                  plainCell("$500"),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = Buffer.from(await Packer.toBuffer(doc));
  const parsed = await parseDocument(buffer, "docx");

  console.log("--- parsed.text ---");
  console.log(parsed.text);
  console.log("--- end ---");

  // Plain cells → " || " delimiter
  for (const expected of [
    "Item || Qty || Price",
    "Cabinets || 1 || $4,200",
  ]) {
    if (!parsed.text.includes(expected)) {
      throw new Error(`Missing exact line ${JSON.stringify(expected)}`);
    }
  }

  // <br> inside cell → " / ", not a newline mid-row
  if (!parsed.text.includes("Line A / Line B || 2 || $100")) {
    throw new Error(
      `Expected <br>-in-cell row with " / ". Got: ${JSON.stringify(parsed.text)}`
    );
  }
  if (parsed.text.includes("Line A\n") || parsed.text.includes("Line A\nLine B")) {
    throw new Error(
      `Cell-internal <br> still produced a newline. Got: ${JSON.stringify(parsed.text)}`
    );
  }

  // Literal "|" stays intact and is distinct from " || "
  if (!parsed.text.includes("50% | 50%")) {
    throw new Error(
      `Literal pipe in cell content was corrupted. Got: ${JSON.stringify(parsed.text)}`
    );
  }
  if (!parsed.text.includes("Split cost || 50% | 50% || $500")) {
    throw new Error(
      `Expected literal-pipe row with " || " delimiters. Got: ${JSON.stringify(parsed.text)}`
    );
  }

  console.log("PASS: DOCX table format verified (plain, br-in-cell, literal-pipe)");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
