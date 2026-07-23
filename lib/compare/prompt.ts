import type { DocumentSection } from "@/lib/compare/full-content";

export const SYSTEM_PROMPT = `You are Clarion, a document comparison analyst for construction and renovation quotes.
Compare Document A and Document B thoroughly using ONLY the content provided.
Identify concrete differences and classify each finding into exactly one category:
- price_difference: same or equivalent line item priced differently
- missing_item: an item/fee/clause present in one document but absent in the other
- scope_difference: difference in work scope, materials, or included services
- term_difference: difference in terms (timeline, warranty, payment, permits, etc.)
- other: any material difference that does not fit the above

Rules:
- Prefer specific, auditable findings over vague summaries.
- For each finding, cite the best available section/heading reference in source_a_ref and/or source_b_ref when possible; use null when a side has no corresponding text.
- Do not invent numbers, line items, or terms that are not in the documents.
- If the two documents have no material differences, that is a valid result: call record_comparison with an EMPTY findings array and a summary that says so — never invent a finding just to have something to report.
- Write the summary and every description in clear English plain text (no Markdown).
- You MUST call the record_comparison tool with a short overall summary and the full findings list (which may be empty).`;

export const RECORD_COMPARISON_TOOL_NAME = "record_comparison" as const;

export const RECORD_COMPARISON_TOOL = {
  name: RECORD_COMPARISON_TOOL_NAME,
  description:
    "Record the structured comparison summary and categorized findings.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "Short overall summary of the most important differences between the two documents.",
      },
      findings: {
        type: "array",
        description:
          "List of categorized differences found between the documents. Use an empty array if the documents have no material differences — do not invent a finding to avoid an empty list.",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "price_difference",
                "missing_item",
                "scope_difference",
                "term_difference",
                "other",
              ],
            },
            description: {
              type: "string",
              description:
                "Human-readable finding, e.g. 'Document B omits permit filing fee included in Document A'.",
            },
            source_a_ref: {
              type: "string",
              description:
                "Section/heading reference in Document A. Use an empty string if not applicable.",
            },
            source_b_ref: {
              type: "string",
              description:
                "Section/heading reference in Document B. Use an empty string if not applicable.",
            },
          },
          required: ["category", "description", "source_a_ref", "source_b_ref"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "findings"],
    additionalProperties: false,
  },
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

function formatDocumentBody(
  label: "Document A" | "Document B",
  title: string,
  sections: DocumentSection[]
): string {
  const body = sections
    .map((section) => {
      const heading = section.heading?.trim() || "(no heading)";
      return `### ${heading}\n${section.content.trim()}`;
    })
    .join("\n\n");

  return `## ${label}: ${title}\n\n${body}`;
}

/**
 * Build Anthropic messages for a full-document comparison turn
 * (BACKEND_MASTER.md §7 — full content grouped by heading, not top-k).
 */
export function buildComparisonMessages(
  docATitle: string,
  docASections: DocumentSection[],
  docBTitle: string,
  docBSections: DocumentSection[]
): { system: string; messages: AnthropicMessage[] } {
  const userContent = [
    "Compare the following two documents and call the record_comparison tool.",
    "",
    formatDocumentBody("Document A", docATitle, docASections),
    "",
    formatDocumentBody("Document B", docBTitle, docBSections),
  ].join("\n");

  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  };
}
