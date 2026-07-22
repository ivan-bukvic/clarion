export type Chunk = {
  heading: string | null;
  content: string;
};

const FIXED_CHUNK_SIZE_CHARS = 3000; // ~600-800 tokens, rough approximation
const OVERLAP_CHARS = 300; // ~10%

/**
 * Chunking strategy per BACKEND_MASTER.md §5:
 * - Clear heading structure detected -> split on headings
 * - Otherwise -> fixed-size chunks with ~10% overlap
 *
 * `headings` from parseDocument() is currently always empty (see parse.ts
 * note), so this always falls back to fixed-size chunking today. Revisit
 * once heading-aware DOCX parsing is wired up.
 */
export function chunkText(text: string, headings: string[]): Chunk[] {
  if (headings.length > 0) {
    return chunkByHeadings(text, headings);
  }
  return chunkFixedSize(text);
}

function chunkByHeadings(text: string, _headings: string[]): Chunk[] {
  // Placeholder until heading-aware parsing exists (see parse.ts).
  return chunkFixedSize(text);
}

function chunkFixedSize(text: string): Chunk[] {
  const clean = text.trim();
  if (clean.length === 0) return [];

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + FIXED_CHUNK_SIZE_CHARS, clean.length);
    chunks.push({ heading: null, content: clean.slice(start, end) });
    if (end === clean.length) break;
    start = end - OVERLAP_CHARS;
  }

  return chunks;
}
