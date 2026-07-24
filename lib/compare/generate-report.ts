import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Database } from "@/types/supabase";
import type { FindingCategory } from "@/lib/compare/findings";

type ServiceClient = SupabaseClient<Database>;

const REPORTS_BUCKET = "documents";
const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// US Letter (8.5" × 11") — Ridgeline is a US demo client.
const PAGE_WIDTH_DXA = 12240;
const PAGE_HEIGHT_DXA = 15840;
const PAGE_MARGIN_DXA = 720; // 0.5" each side
const TABLE_WIDTH_DXA = PAGE_WIDTH_DXA - PAGE_MARGIN_DXA * 2; // 10800 (~7.5")

// Column mix: Description takes ~50%; Document A/B stay narrow (short refs).
const COL_CATEGORY_DXA = 2000; // ~18.5%
const COL_DESCRIPTION_DXA = 5400; // 50%
const COL_DOC_A_DXA = 1700; // ~15.7%
const COL_DOC_B_DXA = 1700; // ~15.7%

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  price_difference: "Price difference",
  missing_item: "Missing item",
  scope_difference: "Scope difference",
  term_difference: "Term difference",
  other: "Other",
};

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 8, color: "CCCCCC" },
};

export type GenerateReportResult =
  | { ok: true; file_path: string }
  | { ok: false; message: string };

/** Fields needed to build a report — callers pass a row already loaded + titles. */
export type ComparisonForReport = Pick<
  Database["public"]["Tables"]["comparisons"]["Row"],
  "id" | "status" | "summary" | "document_a_id" | "document_b_id"
> & {
  document_a_title: string;
  document_b_title: string;
};

/**
 * Build a structured .docx for a completed comparison, upload it to the
 * private documents bucket under reports/, and upsert generated_reports
 * (status ready/failed). Never throws — callers (after() trigger and retry
 * route) treat failure as non-fatal to an already-completed comparison.
 */
export async function generateComparisonReport(
  supabase: ServiceClient,
  comparison: ComparisonForReport
): Promise<GenerateReportResult> {
  // Track a successful Storage upload across the outer catch so a thrown
  // error after upload still links file_url (no orphaned objects).
  let uploadedPath: string | null = null;

  try {
    if (comparison.status !== "completed") {
      return {
        ok: false,
        message: "Report can only be generated for a completed comparison.",
      };
    }

    const comparisonId = comparison.id;

    const { data: findings, error: findingsError } = await supabase
      .from("comparison_findings")
      .select("category, description, source_a_ref, source_b_ref")
      .eq("comparison_id", comparisonId);

    if (findingsError) {
      console.error("DOCX_GENERATION_FAILED", findingsError);
      return markReportFailed(
        supabase,
        comparisonId,
        "Could not load comparison findings for the report."
      );
    }

    let buffer: Buffer;
    try {
      buffer = await buildReportBuffer({
        titleA: comparison.document_a_title,
        titleB: comparison.document_b_title,
        summary: comparison.summary,
        findings: findings ?? [],
      });
    } catch (err) {
      console.error("DOCX_GENERATION_FAILED", err);
      return markReportFailed(
        supabase,
        comparisonId,
        "Could not build the Word report. Please try again."
      );
    }

    const storagePath = reportStoragePath(comparisonId);

    const { error: uploadError } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: DOCX_CONTENT_TYPE,
        upsert: true,
      });

    if (uploadError) {
      console.error("DOCX_GENERATION_FAILED", uploadError);
      return markReportFailed(
        supabase,
        comparisonId,
        "Could not store the generated report. Please try again."
      );
    }

    uploadedPath = storagePath;

    const { error: upsertError } = await supabase
      .from("generated_reports")
      .upsert(
        {
          comparison_id: comparisonId,
          file_url: storagePath,
          status: "ready",
          error_message: null,
        },
        { onConflict: "comparison_id" }
      );

    if (upsertError) {
      console.error("DOCX_GENERATION_FAILED", upsertError);
      return markReportFailed(
        supabase,
        comparisonId,
        "Could not save the report record. Please try again.",
        uploadedPath
      );
    }

    return { ok: true, file_path: storagePath };
  } catch (err) {
    console.error("DOCX_GENERATION_FAILED", err);
    return markReportFailed(
      supabase,
      comparison.id,
      "Report generation failed unexpectedly. Please try again.",
      uploadedPath
    );
  }
}

async function markReportFailed(
  supabase: ServiceClient,
  comparisonId: string,
  message: string,
  /** Prefer an in-memory path from a successful upload over a pending DB row. */
  knownFileUrl?: string | null
): Promise<GenerateReportResult> {
  let fileUrl = knownFileUrl ?? null;

  if (!fileUrl) {
    const { data: existing, error: existingError } = await supabase
      .from("generated_reports")
      .select("file_url")
      .eq("comparison_id", comparisonId)
      .maybeSingle();

    if (existingError) {
      console.error("DOCX_GENERATION_FAILED", {
        comparison_id: comparisonId,
        lookup_error: existingError,
        message,
      });
    }
    fileUrl = existing?.file_url ?? null;
  }

  if (fileUrl) {
    // File exists in Storage (this attempt or a prior one) — keep ready so
    // the object is not orphaned behind a failed status.
    const { error } = await supabase.from("generated_reports").upsert(
      {
        comparison_id: comparisonId,
        status: "ready",
        file_url: fileUrl,
        error_message: null,
      },
      { onConflict: "comparison_id" }
    );
    if (error) {
      console.error("DOCX_GENERATION_FAILED", {
        comparison_id: comparisonId,
        restore_ready_error: error,
        message,
      });
    }
    return { ok: false, message };
  }

  const { error } = await supabase.from("generated_reports").upsert(
    {
      comparison_id: comparisonId,
      status: "failed",
      error_message: message,
    },
    { onConflict: "comparison_id" }
  );
  if (error) {
    console.error("DOCX_GENERATION_FAILED", {
      comparison_id: comparisonId,
      mark_failed_error: error,
      message,
    });
  }
  return { ok: false, message };
}

function buildReportBuffer(input: {
  titleA: string;
  titleB: string;
  summary: string | null;
  findings: Array<{
    category: FindingCategory;
    description: string;
    source_a_ref: string | null;
    source_b_ref: string | null;
  }>;
}): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Comparison Report: ${input.titleA} vs ${input.titleB}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: "Summary", bold: true })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: input.summary?.trim() || "No summary available.",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: "Findings", bold: true })],
    }),
  ];

  if (input.findings.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "No material differences found.",
            italics: true,
          }),
        ],
      })
    );
  } else {
    children.push(buildFindingsTable(input.findings));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_DXA,
              height: PAGE_HEIGHT_DXA,
            },
            margin: {
              top: PAGE_MARGIN_DXA,
              right: PAGE_MARGIN_DXA,
              bottom: PAGE_MARGIN_DXA,
              left: PAGE_MARGIN_DXA,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function buildFindingsTable(
  findings: Array<{
    category: FindingCategory;
    description: string;
    source_a_ref: string | null;
    source_b_ref: string | null;
  }>
): Table {
  const columnWidths = [
    COL_CATEGORY_DXA,
    COL_DESCRIPTION_DXA,
    COL_DOC_A_DXA,
    COL_DOC_B_DXA,
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Category", "Description", "Document A", "Document B"].map(
      (label, index) => headerCell(label, columnWidths[index])
    ),
  });

  const dataRows = findings.map(
    (finding) =>
      new TableRow({
        children: [
          bodyCell(CATEGORY_LABELS[finding.category], COL_CATEGORY_DXA),
          bodyCell(finding.description, COL_DESCRIPTION_DXA),
          bodyCell(finding.source_a_ref ?? "—", COL_DOC_A_DXA),
          bodyCell(finding.source_b_ref ?? "—", COL_DOC_B_DXA),
        ],
      })
  );

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: TABLE_BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "F3F4F6" },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 20 })],
      }),
    ],
  });
}

function bodyCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: TABLE_BORDERS,
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  });
}

export function reportStoragePath(comparisonId: string): string {
  return `reports/${comparisonId}.docx`;
}

export { REPORTS_BUCKET, DOCX_CONTENT_TYPE };
