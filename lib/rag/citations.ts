import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type Citation = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  heading: string | null;
  content: string;
};

/**
 * Resolve cited_chunk_ids into display-ready citation objects
 * (document title + heading) without denormalizing into chat_messages.
 */
export async function resolveCitations(
  supabase: SupabaseClient<Database>,
  chunkIds: string[]
): Promise<Citation[]> {
  if (chunkIds.length === 0) return [];

  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, document_id, heading, content, documents(title)")
    .in("id", chunkIds);

  if (error) {
    throw new Error(`Failed to resolve citations: ${error.message}`);
  }

  const byId = new Map(
    (data ?? []).map((row) => {
      const docs = row.documents as { title: string } | { title: string }[] | null;
      const title = Array.isArray(docs)
        ? (docs[0]?.title ?? "Unknown document")
        : (docs?.title ?? "Unknown document");

      return [
        row.id,
        {
          chunk_id: row.id,
          document_id: row.document_id,
          document_title: title,
          heading: row.heading,
          content: row.content,
        } satisfies Citation,
      ];
    })
  );

  // Preserve cited_chunk_ids order from the assistant message
  return chunkIds
    .map((id) => byId.get(id))
    .filter((c): c is Citation => c !== undefined);
}
