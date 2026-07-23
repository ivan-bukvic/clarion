/**
 * Faza 2 smoke: retrieve + grounded chat turn against a known corpus doc.
 * Imports production lib code (not a forked copy).
 *
 * Run: npm run test:chat
 *   or: npx tsx --env-file=.env.local scripts/smoke-test-chat.ts
 */
import { anthropic, CLAUDE_MODEL } from "../lib/llm/client";
import { retrieveChunks } from "../lib/rag/retrieve";
import {
  buildChatMessages,
  NO_CHUNKS_REPLY,
} from "../lib/rag/prompt";
import { ingestFixture, serviceClient } from "./lib/ingest-fixture";

async function ingestCorpusFixture(text: string, sourceFile: string) {
  const result = await ingestFixture({
    purpose: "corpus",
    fileType: "txt",
    sourceFile,
    buffer: Buffer.from(text, "utf-8"),
    contentType: "text/plain",
    ext: "txt",
  });
  return result.documentId;
}

async function runChatTurn(userMessage: string) {
  const supabase = serviceClient();

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .insert({})
    .select("id")
    .single();
  if (sessionError || !session) {
    throw new Error(`session create failed: ${sessionError?.message}`);
  }

  const { data: userRow, error: userError } = await supabase
    .from("chat_messages")
    .insert({
      chat_session_id: session.id,
      role: "user",
      content: userMessage,
      cited_chunk_ids: [],
    })
    .select()
    .single();
  if (userError || !userRow) {
    throw new Error(`user insert failed: ${userError?.message}`);
  }

  const chunks = await retrieveChunks(supabase, userMessage);
  const similarities = chunks.map((c) => Number(c.similarity.toFixed(4)));

  if (chunks.length === 0) {
    const { data: assistantRow, error: assistantError } = await supabase
      .from("chat_messages")
      .insert({
        chat_session_id: session.id,
        role: "assistant",
        content: NO_CHUNKS_REPLY,
        cited_chunk_ids: [],
      })
      .select()
      .single();
    if (assistantError || !assistantRow) {
      throw new Error(`assistant insert failed: ${assistantError?.message}`);
    }
    return {
      sessionId: session.id,
      cited_chunk_ids: [] as string[],
      content: assistantRow.content,
      noChunks: true as const,
      similarities,
    };
  }

  const { system, messages } = buildChatMessages([], chunks, userMessage);
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system,
    messages,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  const replyText =
    textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  if (!replyText) throw new Error("CHAT_GENERATION_FAILED: empty reply");

  const cited = chunks.map((c) => c.id);
  const { data: assistantRow, error: assistantError } = await supabase
    .from("chat_messages")
    .insert({
      chat_session_id: session.id,
      role: "assistant",
      content: replyText,
      cited_chunk_ids: cited,
    })
    .select()
    .single();
  if (assistantError || !assistantRow) {
    throw new Error(`assistant insert failed: ${assistantError?.message}`);
  }

  return {
    sessionId: session.id,
    cited_chunk_ids: cited,
    content: assistantRow.content,
    noChunks: false as const,
    similarities,
  };
}

async function main() {
  const fixtureText = [
    "Ridgeline Renovations — Kitchen Remodel Quote",
    "",
    "Cabinet allowance: $4,200.",
    "Countertop allowance: $1,800.",
    "Permit filing fee: $350.",
    "Total project estimate: $12,450 including labor.",
  ].join("\n");

  const documentId = await ingestCorpusFixture(
    fixtureText,
    "smoke-chat-corpus.txt"
  );
  console.log("ingested corpus fixture:", { documentId });

  const inCorpus = await runChatTurn(
    "What is the cabinet allowance in the Ridgeline kitchen remodel quote?"
  );
  if (inCorpus.noChunks || inCorpus.cited_chunk_ids.length === 0) {
    throw new Error(
      `Expected in-corpus citations, got cited_chunk_ids=${JSON.stringify(inCorpus.cited_chunk_ids)} content=${JSON.stringify(inCorpus.content)}`
    );
  }
  if (!/4200|4,200/i.test(inCorpus.content)) {
    throw new Error(
      `Expected answer to mention $4,200. Got: ${JSON.stringify(inCorpus.content)}`
    );
  }
  console.log("in-corpus turn:", {
    sessionId: inCorpus.sessionId,
    cited: inCorpus.cited_chunk_ids.length,
    similarities: inCorpus.similarities,
    preview: inCorpus.content.slice(0, 120),
  });

  const outOfCorpus = await runChatTurn(
    "What is the capital of Mars and who is the mayor of Atlantis?"
  );
  if (!outOfCorpus.noChunks || outOfCorpus.cited_chunk_ids.length !== 0) {
    // Soft path: retrieval might still return weak matches above threshold.
    // Require empty citations OR explicit don't-know framing.
    const saysDontKnow =
      /don'?t know|do not know|not enough|cannot find|couldn't find|no (relevant )?source/i.test(
        outOfCorpus.content
      );
    if (outOfCorpus.cited_chunk_ids.length > 0 && !saysDontKnow) {
      throw new Error(
        `Out-of-corpus should not invent an answer. Got citations=${outOfCorpus.cited_chunk_ids.length} content=${JSON.stringify(outOfCorpus.content)}`
      );
    }
  }
  if (outOfCorpus.noChunks && outOfCorpus.content !== NO_CHUNKS_REPLY) {
    throw new Error(
      `Expected deterministic NO_CHUNKS_REPLY. Got: ${JSON.stringify(outOfCorpus.content)}`
    );
  }
  console.log("out-of-corpus turn:", {
    sessionId: outOfCorpus.sessionId,
    noChunks: outOfCorpus.noChunks,
    cited: outOfCorpus.cited_chunk_ids.length,
    similarities: outOfCorpus.similarities,
    preview: outOfCorpus.content.slice(0, 120),
  });

  // Cleanup fixture document (cascades chunks)
  const supabase = serviceClient();
  await supabase.from("documents").delete().eq("id", documentId);
  await supabase.from("chat_sessions").delete().eq("id", inCorpus.sessionId);
  await supabase.from("chat_sessions").delete().eq("id", outOfCorpus.sessionId);

  console.log("PASS: RAG retrieve + grounded chat turns succeeded");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
