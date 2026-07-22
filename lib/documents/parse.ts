import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ParsedDocument = {
  text: string;
  /** Detected section headings, if any — used to decide chunking strategy. */
  headings: string[];
};

/**
 * Extracts raw text from an uploaded PDF/DOCX/TXT file buffer. Server-only —
 * never runs uploaded file content, only reads text out of it. See
 * SECURITY.md §2 and §4.
 *
 * NOTE: pdf-parse v2 uses a class-based API (`new PDFParse({ data }).getText()`),
 * different from the v1 `pdf(buffer)` function API referenced in older
 * examples — flagging here since BACKEND_MASTER.md doesn't specify the
 * package major version.
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "txt"
): Promise<ParsedDocument> {
  try {
    if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return { text: result.text, headings: [] };
    }

    if (fileType === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        headings: extractHeadingsFromPlainText(result.value),
      };
    }

    // txt
    return { text: buffer.toString("utf-8"), headings: [] };
  } catch (err) {
    throw new Error(
      `PARSE_FAILED: could not extract text from ${fileType} file — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Very small heuristic: mammoth's extractRawText strips formatting, so we
 * can't detect headings from style info alone at this stage. Placeholder —
 * real heading-aware chunking (BACKEND_MASTER.md §3) may need
 * mammoth.convertToHtml() instead of extractRawText() to preserve <h1-6>
 * tags. Flagged as a Faza 1 decision point, not resolved here.
 */
function extractHeadingsFromPlainText(_text: string): string[] {
  return [];
}
