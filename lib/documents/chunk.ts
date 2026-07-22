import type { ParsedDocument } from "@/lib/documents/parse";

export type Chunk = {
  heading: string | null;
  content: string;
};

const FIXED_CHUNK_SIZE_CHARS = 3000; // ~600-800 tokens, rough approximation
const OVERLAP_CHARS = 300; // ~10%

/**
 * Chunking strategy per BACKEND_MASTER.md §5:
 * - Structured DOCX sections (from heading tags) → one or more chunks per
 *   section, preserving the section heading on every sub-chunk
 * - Unstructured PDF/TXT (single null-heading section) → fixed-size chunks
 *   with ~10% overlap
 */
export function chunkText(parsed: ParsedDocument): Chunk[] {
  const chunks: Chunk[] = [];

  for (const section of parsed.sections) {
    const trimmed = section.content.trim();
    // Heading-only sections (next heading follows immediately) still need a
    // searchable chunk — use the heading text as content rather than dropping.
    const content = trimmed || section.heading?.trim() || "";
    if (!content) continue;

    if (content.length <= FIXED_CHUNK_SIZE_CHARS) {
      chunks.push({ heading: section.heading, content });
      continue;
    }

    for (const piece of splitFixedSize(content)) {
      chunks.push({ heading: section.heading, content: piece });
    }
  }

  return chunks;
}

function splitFixedSize(text: string): string[] {
  const pieces: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + FIXED_CHUNK_SIZE_CHARS, text.length);
    pieces.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - OVERLAP_CHARS;
  }

  return pieces;
}
