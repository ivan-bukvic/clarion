import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type DocumentSection = {
  heading: string | null;
  content: string;
};

export type ParsedDocument = {
  text: string;
  headings: string[];
  sections: DocumentSection[];
};

/**
 * Extracts text from an uploaded PDF/DOCX/TXT buffer. Server-only —
 * never runs uploaded file content, only reads text out of it. See
 * SECURITY.md §2 and §4.
 *
 * DOCX uses mammoth.convertToHtml so <h1-h6> structure is preserved for
 * heading-aware chunking (BACKEND_MASTER.md §5). PDF/TXT fall back to a
 * single unstructured section — plain text is never run through the HTML
 * stripper (angle brackets like "< $10,000" must survive intact).
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "txt"
): Promise<ParsedDocument> {
  try {
    if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return toUnstructured(result.text, normalizePlainText);
    }

    if (fileType === "docx") {
      const result = await mammoth.convertToHtml({ buffer });
      return sectionsFromHtml(result.value);
    }

    return toUnstructured(buffer.toString("utf-8"), normalizePlainText);
  } catch (err) {
    throw new Error(
      `PARSE_FAILED: could not extract text from ${fileType} file — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

function toUnstructured(
  raw: string,
  normalize: (s: string) => string
): ParsedDocument {
  const text = normalize(raw);
  if (!text) {
    throw new Error("PARSE_FAILED: extracted content was empty");
  }
  return {
    text,
    headings: [],
    sections: [{ heading: null, content: text }],
  };
}

function normalizePlainText(raw: string): string {
  return raw
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split HTML on heading tags. Content before the first heading becomes a
 * null-heading preamble section. If no headings exist, returns one
 * unstructured section with the full plain text.
 */
function sectionsFromHtml(html: string): ParsedDocument {
  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches = [...html.matchAll(headingRe)];

  if (matches.length === 0) {
    return toUnstructured(html, htmlToPlainText);
  }

  const sections: DocumentSection[] = [];
  const headings: string[] = [];

  const firstIndex = matches[0].index ?? 0;
  if (firstIndex > 0) {
    const preamble = htmlToPlainText(html.slice(0, firstIndex));
    if (preamble) {
      sections.push({ heading: null, content: preamble });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const heading = htmlToPlainText(match[2]);
    const start = (match.index ?? 0) + match[0].length;
    const end =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? html.length)
        : html.length;
    const content = htmlToPlainText(html.slice(start, end));

    if (heading) headings.push(heading);
    if (!heading && !content) continue;
    sections.push({ heading: heading || null, content });
  }

  const text = sections
    .map((s) => (s.heading ? `${s.heading}\n${s.content}` : s.content))
    .join("\n\n")
    .trim();

  if (!text) {
    throw new Error("PARSE_FAILED: extracted content was empty");
  }

  return { text, headings, sections };
}

/**
 * Convert mammoth HTML to plain text. Table cell/row boundaries are
 * preserved so pricing tables stay readable (e.g. "Item || Qty || Price").
 * Used only on HTML — never on raw PDF/TXT.
 *
 * mammoth wraps every cell in <p>...</p>; those (and any <br> inside the
 * cell) must be neutralized before generic newline rules run, otherwise
 * rows break mid-cell.
 *
 * Column delimiter is " || " (not " | ") so a literal "|" in cell text
 * (e.g. "50% | 50%") stays distinguishable from the synthetic separator.
 *
 * Known limitation: nested tables inside a cell (<td><table>...) are not
 * supported — the non-greedy regex is not nesting-aware. Demo documents
 * (Ridgeline-style quotes) use flat pricing tables only; no HTML parser
 * dependency is added for a case that does not appear in project scope.
 */
function htmlToPlainText(html: string): string {
  const withoutCellBreaks = html.replace(
    /<(t[dh])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const cleaned = inner
        .replace(/<br\s*\/?>/gi, " / ")
        .replace(/<\/?p\b[^>]*>/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      return `<${tag}${attrs}>${cleaned}</${tag}>`;
    }
  );

  return withoutCellBreaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " || ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Drop trailing cell separator before newline / end of string
    .replace(/ \|\| (\n|$)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
