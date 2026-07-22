/**
 * Embedding helper — Voyage AI (voyage-3-lite, 512 dimensions).
 * Anthropic has no first-party embedding endpoint; Voyage is Anthropic's
 * recommended embedding partner for Claude-based RAG apps.
 *
 * IMPORTANT: this exact model must be used for both ingestion (Faza 1) and
 * query-time embedding (Faza 2) — mismatched models silently break retrieval.
 * See BACKEND_MASTER.md §5.
 */

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
export const EMBEDDING_MODEL = "voyage-3-lite" as const;
export const EMBEDDING_DIMENSION = 512 as const;

type VoyageEmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
};

/**
 * Embed one or more text chunks. `inputType` follows Voyage's asymmetric
 * embedding convention: use "document" when embedding chunks at ingestion
 * time, and "query" when embedding the user's chat question at query time.
 */
export async function embed(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    throw new Error(`EMBEDDING_FAILED: Voyage API returned ${res.status}`);
  }

  const json: VoyageEmbeddingResponse = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
