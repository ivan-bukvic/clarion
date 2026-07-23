import type { RetrievedChunk } from "@/lib/rag/retrieve";

export const SYSTEM_PROMPT = `You are Clarion, a document Q&A assistant.
Answer ONLY using the retrieved document chunks provided in the user message.
If the chunks do not contain enough information to answer, say you don't know — do not guess or use outside knowledge.
When you answer, stay faithful to the source wording; do not invent numbers, names, or clauses that are not in the chunks.
Keep answers concise and clear.
Reply in plain text only — no Markdown formatting (no **bold**, no bullet lists with - or *, no headings).`;

export const NO_CHUNKS_REPLY =
  "I don't know based on the uploaded documents. None of the available sources cover this question closely enough.";

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Build Anthropic messages[] for a grounded chat turn.
 * Retrieved chunks are injected into the current user turn so the model
 * must answer from that context (BACKEND_MASTER.md §6 prompt rule).
 */
export function buildChatMessages(
  history: HistoryMessage[],
  retrievedChunks: RetrievedChunk[],
  userMessage: string
): { system: string; messages: AnthropicMessage[] } {
  const contextBlock = retrievedChunks
    .map((chunk, i) => {
      const heading = chunk.heading ? ` (${chunk.heading})` : "";
      return `[Source ${i + 1}${heading}]\n${chunk.content}`;
    })
    .join("\n\n");

  const groundedUserMessage = `Retrieved sources:\n\n${contextBlock}\n\n---\n\nUser question: ${userMessage}`;

  const messages: AnthropicMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: groundedUserMessage },
  ];

  return { system: SYSTEM_PROMPT, messages };
}
