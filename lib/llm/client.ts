import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic Claude client — used for RAG chat generation and comparison
 * analysis. Server-only: never import this file from a client component.
 * See BACKEND_MASTER.md §6-7 and SECURITY.md §2.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = "claude-sonnet-4-5" as const;
