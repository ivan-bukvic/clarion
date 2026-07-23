import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "@/lib/llm/embeddings";
import type { Database } from "@/types/supabase";

export type RetrievedChunk = {
  id: string;
  document_id: string;
  heading: string | null;
  content: string;
  similarity: number;
};

const DEFAULT_K = 5;
// Empirical tuning knob — not a BACKEND_MASTER.md §6 spec value.
// Re-run `npm run test:chat` after changing this and check the logged
// similarity scores still separate the in-corpus and out-of-corpus cases.
const DEFAULT_MIN_SIMILARITY = 0.2;

/**
 * Query-time retrieval for RAG chat (BACKEND_MASTER.md §6).
 * Embeds the user message with input_type "query" (same Voyage model as
 * ingestion) and runs match_document_chunks over purpose=corpus ready docs.
 *
 * Throws with message prefix EMBEDDING_FAILED when the Voyage call fails so
 * the chat route can map it to a structured error code.
 */
export async function retrieveChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  opts?: { k?: number; minSimilarity?: number }
): Promise<RetrievedChunk[]> {
  const k = opts?.k ?? DEFAULT_K;
  const minSimilarity = opts?.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  let queryEmbedding: number[];
  try {
    const [embedding] = await embed([query], "query");
    queryEmbedding = embedding;
  } catch (err) {
    throw new Error(
      `EMBEDDING_FAILED: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: k,
    min_similarity: minSimilarity,
  });

  if (error) {
    throw new Error(`EMBEDDING_FAILED: similarity search failed — ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    document_id: row.document_id,
    heading: row.heading,
    content: row.content,
    similarity: row.similarity,
  }));
}
