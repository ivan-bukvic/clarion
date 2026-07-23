import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type DocumentSection = {
  heading: string | null;
  content: string;
};

export type FullDocumentContent = {
  document_id: string;
  title: string;
  sections: DocumentSection[];
};

/**
 * Load the full chunked content of a document for comparison analysis
 * (BACKEND_MASTER.md §7) — all chunks, not top-k retrieval.
 *
 * Takes an already-fetched {id, title} rather than re-querying documents —
 * callers (app/api/compare/route.ts) already loaded this during validation.
 *
 * Chunks are ordered by created_at (each row now gets an explicit,
 * strictly-increasing timestamp at insert time — see
 * app/api/documents/upload/route.ts — so this reflects real document
 * order, not just bulk-insert arrival order) and grouped by heading. Known
 * limitation: fixed-size sub-chunks of the same section share ~300 char
 * overlap from chunk.ts; concatenating them can leave a small duplicated
 * span at the join. Acceptable for short demo documents.
 */
export async function fetchFullDocumentContent(
  supabase: SupabaseClient<Database>,
  document: { id: string; title: string }
): Promise<FullDocumentContent> {
  const { data: chunks, error: chunkError } = await supabase
    .from("document_chunks")
    .select("heading, content, created_at")
    .eq("document_id", document.id)
    .order("created_at", { ascending: true });

  if (chunkError) {
    throw new Error(
      `COMPARISON_GENERATION_FAILED: could not load chunks — ${chunkError.message}`
    );
  }
  if (!chunks || chunks.length === 0) {
    throw new Error(
      `COMPARISON_GENERATION_FAILED: document has no chunks (${document.id})`
    );
  }

  const sections: DocumentSection[] = [];
  for (const chunk of chunks) {
    const last = sections[sections.length - 1];
    if (last && last.heading === chunk.heading) {
      last.content = `${last.content}\n${chunk.content}`.trim();
    } else {
      sections.push({
        heading: chunk.heading,
        content: chunk.content,
      });
    }
  }

  return {
    document_id: document.id,
    title: document.title,
    sections,
  };
}
