/**
 * Shared smoke-test ingestion helper — single copy of the
 * upload → insert → parse → chunk → embed → insert-chunks → ready pipeline.
 * Used by smoke-test-ingestion.ts and smoke-test-chat.ts so the pipeline
 * cannot drift between test scripts (Faza 1/2 review lesson).
 *
 * Kept under scripts/ (not production lib/) — test-only tooling.
 */
import { createClient } from "@supabase/supabase-js";
import { parseDocument } from "../../lib/documents/parse";
import { chunkText } from "../../lib/documents/chunk";
import { embed } from "../../lib/llm/embeddings";
import type { Database } from "../../types/supabase";

function serviceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function ingestFixture(opts: {
  purpose: Database["public"]["Enums"]["document_purpose"];
  fileType: Database["public"]["Enums"]["document_file_type"];
  sourceFile: string;
  buffer: Buffer;
  contentType: string;
  ext: string;
}) {
  const supabase = serviceClient();
  const documentId = crypto.randomUUID();
  // Same path rule as upload route: server-generated id + validated ext only
  const storagePath = `${opts.purpose}/${documentId}.${opts.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, opts.buffer, {
      contentType: opts.contentType,
      upsert: false,
    });
  if (uploadError) throw new Error(`UPLOAD_FAILED: ${uploadError.message}`);

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    title: opts.sourceFile.replace(/\.[^.]+$/, ""),
    source_file: opts.sourceFile,
    file_type: opts.fileType,
    purpose: opts.purpose,
    storage_path: storagePath,
    status: "processing",
  });
  if (insertError) throw new Error(`UPLOAD_FAILED: ${insertError.message}`);

  // Production parse + chunk — not a local reimplementation
  const parsed = await parseDocument(opts.buffer, opts.fileType);
  const chunks = chunkText(parsed);
  if (chunks.length === 0) throw new Error("PARSE_FAILED: no chunks");

  const embeddings = await embed(
    chunks.map((c) => c.content),
    "document"
  );
  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    heading: chunk.heading,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]) as unknown as string,
  }));

  const { error: chunkError } = await supabase
    .from("document_chunks")
    .insert(rows);
  if (chunkError) throw new Error(`EMBEDDING_FAILED: ${chunkError.message}`);

  const { error: readyError } = await supabase
    .from("documents")
    .update({ status: "ready" })
    .eq("id", documentId);
  if (readyError) throw new Error(`UPLOAD_FAILED: ${readyError.message}`);

  return {
    documentId,
    chunkCount: chunks.length,
    headings: parsed.headings,
    text: parsed.text,
    chunks,
  };
}

export { serviceClient };
