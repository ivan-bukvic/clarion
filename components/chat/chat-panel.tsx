"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat/chat-message";
import type { Citation } from "@/lib/rag/citations";
import type { Tables } from "@/types/supabase";

type MessageRow = Tables<"chat_messages">;

export type ChatMessageView = {
  message: MessageRow;
  citations: Citation[];
};

export function ChatPanel({
  initialSessionId,
  initialMessages,
  hasReadyCorpus,
}: {
  initialSessionId: string | null;
  initialMessages: ChatMessageView[];
  hasReadyCorpus: boolean;
}) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (!hasReadyCorpus) {
      setError("Upload a document to get started.");
      return;
    }

    setLoading(true);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          chat_session_id: sessionId,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
        chat_session_id?: string;
        user_message?: MessageRow;
        assistant_message?: MessageRow;
        citations?: Citation[];
      };

      if (!res.ok) {
        setError(json.message ?? "Chat failed. Please try again.");
        setInput(trimmed);
        return;
      }

      if (json.chat_session_id) {
        setSessionId(json.chat_session_id);
      }

      const next: ChatMessageView[] = [];
      if (json.user_message) {
        next.push({ message: json.user_message, citations: [] });
      }
      if (json.assistant_message) {
        next.push({
          message: json.assistant_message,
          citations: json.citations ?? [],
        });
      }

      setMessages((prev) => [...prev, ...next]);
    } catch {
      setError("Chat failed. Please try again.");
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-64 flex-1 flex-col rounded-lg border bg-background">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!hasReadyCorpus ? (
          <p className="text-sm text-muted-foreground">
            Upload a document to get started.
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask a question about your uploaded documents.
          </p>
        ) : (
          messages.map(({ message, citations }) => (
            <ChatMessage
              key={message.id}
              message={message}
              citations={citations}
            />
          ))
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-start gap-2 border-t p-3"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasReadyCorpus
                ? "Ask about your documents…"
                : "Upload a document first"
            }
            disabled={!hasReadyCorpus || loading}
            aria-label="Chat message"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={!hasReadyCorpus || loading || !input.trim()}>
          {loading ? "Sending…" : "Send"}
        </Button>
      </form>
    </section>
  );
}
