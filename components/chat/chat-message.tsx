import { CitationBadge } from "@/components/chat/citation-badge";
import type { Citation } from "@/lib/rag/citations";
import type { Tables } from "@/types/supabase";

type MessageRow = Tables<"chat_messages">;

export function ChatMessage({
  message,
  citations,
}: {
  message: MessageRow;
  citations: Citation[];
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-clarion-gradient text-primary-foreground shadow-clarion-btn"
            : "bg-background text-foreground shadow-clarion-sm border"
        }`}
      >
        {message.content}
      </div>

      {!isUser && citations.length > 0 ? (
        <div className="flex max-w-[85%] flex-wrap gap-1.5">
          {citations.map((c) => (
            <CitationBadge key={c.chunk_id} citation={c} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
