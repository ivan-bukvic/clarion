import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/llm/client";
import { retrieveChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
import {
  buildChatMessages,
  NO_CHUNKS_REPLY,
} from "@/lib/rag/prompt";
import { resolveCitations, type Citation } from "@/lib/rag/citations";
import type { Tables } from "@/types/supabase";

export const runtime = "nodejs";

const HISTORY_LIMIT = 10;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  // Optional — omitted or null both mean "start a new session".
  chat_session_id: z.string().uuid().nullable().optional(),
});

type ChatErrorCode =
  | "EMBEDDING_FAILED"
  | "NO_CHUNKS_RETRIEVED"
  | "CHAT_GENERATION_FAILED";

function errorResponse(code: ChatErrorCode, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

type MessageRow = Tables<"chat_messages">;
type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          "message is required; chat_session_id must be a uuid, null, or omitted.",
      },
      { status: 400 }
    );
  }

  const { message, chat_session_id } = parsed.data;
  const supabase = createServiceRoleClient();

  try {
    // --- Resolve existing session (do not create yet) ---
    let sessionId: string | null = chat_session_id ?? null;
    if (sessionId) {
      const { data: existing, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError || !existing) {
        return NextResponse.json(
          { message: "chat_session_id not found." },
          { status: 404 }
        );
      }
    }

    // --- Retrieve (+ history for existing sessions, in parallel) ---
    // Nothing is written to chat_messages until the full turn outcome is known,
    // so EMBEDDING_FAILED / CHAT_GENERATION_FAILED never leave an orphaned user row.
    let chunks: RetrievedChunk[];
    let history: HistoryMessage[] = [];

    if (sessionId) {
      const [retrieveResult, historyResult] = await Promise.all([
        retrieveChunks(supabase, message).then(
          (data) => ({ ok: true as const, data }),
          (err: unknown) => ({ ok: false as const, err })
        ),
        supabase
          .from("chat_messages")
          .select("role, content")
          .eq("chat_session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT),
      ]);

      if (!retrieveResult.ok) {
        console.error("EMBEDDING_FAILED", retrieveResult.err);
        return errorResponse(
          "EMBEDDING_FAILED",
          "Could not search documents. Please try again.",
          500
        );
      }
      chunks = retrieveResult.data;

      if (historyResult.error) {
        console.error("CHAT_HISTORY_FAILED", historyResult.error);
        return errorResponse(
          "CHAT_GENERATION_FAILED",
          "Could not load chat history. Please try again.",
          500
        );
      }

      history = [...(historyResult.data ?? [])]
        .reverse()
        .map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content,
        }));
    } else {
      // New session — no prior history, skip the empty select.
      try {
        chunks = await retrieveChunks(supabase, message);
      } catch (err) {
        console.error("EMBEDDING_FAILED", err);
        return errorResponse(
          "EMBEDDING_FAILED",
          "Could not search documents. Please try again.",
          500
        );
      }
    }

    // --- Compute turn outcome in memory (still no DB writes) ---
    let replyText: string;
    let citedChunkIds: string[] = [];
    let noChunksRetrieved = false;

    if (chunks.length === 0) {
      replyText = NO_CHUNKS_REPLY;
      citedChunkIds = [];
      noChunksRetrieved = true;
    } else {
      const { system, messages } = buildChatMessages(history, chunks, message);
      try {
        const response = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system,
          messages,
        });

        const textBlock = response.content.find((block) => block.type === "text");
        replyText =
          textBlock && textBlock.type === "text"
            ? textBlock.text.trim()
            : "";

        if (!replyText) {
          throw new Error("empty LLM response");
        }
      } catch (err) {
        console.error("CHAT_GENERATION_FAILED", err);
        return errorResponse(
          "CHAT_GENERATION_FAILED",
          "Could not generate a reply. Please try again.",
          500
        );
      }
      citedChunkIds = chunks.map((c) => c.id);
    }

    // --- Persist: create session if needed, then atomic user+assistant insert ---
    // Known limitation (demo scope): concurrent chat posts have no locking.
    // (1) Two tabs with chat_session_id null can each create a separate
    // chat_sessions row — the page always loads the newest session, so the
    // older conversation disappears from view.
    // (2) Two tabs posting into the same existing session near-simultaneously
    // can interleave turns (history fetched before either insert lands), so
    // replies may not see each other's prior message.
    // Accepted residual risk for single-user demo — no session locking/queue
    // (BACKEND_MASTER.md §11).
    if (!sessionId) {
      const { data: created, error: createError } = await supabase
        .from("chat_sessions")
        .insert({})
        .select("id")
        .single();

      if (createError || !created) {
        console.error("CHAT_SESSION_CREATE_FAILED", createError);
        return errorResponse(
          "CHAT_GENERATION_FAILED",
          "Could not start chat session.",
          500
        );
      }
      sessionId = created.id;
    }

    // Explicit timestamps: Postgres now() is evaluated once per statement, so a
    // multi-row insert without these would give both messages identical
    // created_at and make page.tsx history order ambiguous.
    const now = new Date();
    const { data: insertedRows, error: insertError } = await supabase
      .from("chat_messages")
      .insert([
        {
          chat_session_id: sessionId,
          role: "user",
          content: message,
          cited_chunk_ids: [],
          created_at: now.toISOString(),
        },
        {
          chat_session_id: sessionId,
          role: "assistant",
          content: replyText,
          cited_chunk_ids: citedChunkIds,
          created_at: new Date(now.getTime() + 1).toISOString(),
        },
      ])
      .select();

    if (insertError || !insertedRows || insertedRows.length !== 2) {
      console.error("CHAT_MESSAGES_INSERT_FAILED", insertError);
      return errorResponse(
        "CHAT_GENERATION_FAILED",
        "Could not save the reply. Please try again.",
        500
      );
    }

    const userMessage = insertedRows.find((r) => r.role === "user");
    const assistantMessage = insertedRows.find((r) => r.role === "assistant");
    if (!userMessage || !assistantMessage) {
      console.error("CHAT_MESSAGES_INSERT_FAILED", "missing role in insert result");
      return errorResponse(
        "CHAT_GENERATION_FAILED",
        "Could not save the reply. Please try again.",
        500
      );
    }

    let citations: Citation[] = [];
    if (citedChunkIds.length > 0) {
      try {
        citations = await resolveCitations(supabase, citedChunkIds);
      } catch (err) {
        console.error("CITATION_RESOLVE_FAILED", err);
        citations = [];
      }
    }

    return NextResponse.json({
      chat_session_id: sessionId,
      ...(noChunksRetrieved
        ? { code: "NO_CHUNKS_RETRIEVED" satisfies ChatErrorCode }
        : {}),
      user_message: userMessage as MessageRow,
      assistant_message: assistantMessage as MessageRow,
      citations,
    });
  } catch (err) {
    console.error("CHAT_UNEXPECTED", err);
    return errorResponse(
      "CHAT_GENERATION_FAILED",
      "Chat failed unexpectedly. Please try again.",
      500
    );
  }
}
