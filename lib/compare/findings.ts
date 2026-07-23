import { z } from "zod";
import type { Database } from "@/types/supabase";

export type FindingCategory =
  Database["public"]["Enums"]["finding_category"];

export type ParsedFinding = {
  category: FindingCategory;
  description: string;
  source_a_ref: string | null;
  source_b_ref: string | null;
};

export type ParsedComparisonOutput = {
  summary: string;
  findings: ParsedFinding[];
};

const findingCategorySchema = z.enum([
  "price_difference",
  "missing_item",
  "scope_difference",
  "term_difference",
  "other",
]);

const nullableRef = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const findingSchema = z.object({
  category: findingCategorySchema,
  description: z.string().trim().min(1),
  source_a_ref: nullableRef,
  source_b_ref: nullableRef,
});

const comparisonOutputSchema = z.object({
  summary: z.string().trim().min(1),
  // No .min(1) — an empty findings array is a legitimate outcome ("no
  // material differences found"), not a generation failure. See
  // SYSTEM_PROMPT / RECORD_COMPARISON_TOOL in lib/compare/prompt.ts.
  findings: z.array(findingSchema),
});

/**
 * Validate structured LLM tool-use input for a comparison run.
 * Throws with COMPARISON_GENERATION_FAILED prefix on invalid output (bad
 * shape, not merely empty findings) so the API route can map it to the
 * structured error code.
 */
export function parseComparisonOutput(
  raw: unknown
): ParsedComparisonOutput {
  const parsed = comparisonOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `COMPARISON_GENERATION_FAILED: unparseable structured output — ${parsed.error.message}`
    );
  }
  return parsed.data;
}
