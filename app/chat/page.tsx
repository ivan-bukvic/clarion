import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DocumentUpload } from "@/components/chat/document-upload";
import { DocumentList } from "@/components/chat/document-list";
import {
  ChatPanel,
  type ChatMessageView,
} from "@/components/chat/chat-panel";
import { resolveCitations } from "@/lib/rag/citations";

export default async function ChatPage() {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    redirect("/login");
  }

  const supabase = createServiceRoleClient();

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (documentsError) {
    console.error("Failed to load documents", documentsError);
  }

  const corpusDocs = (documents ?? []).filter((d) => d.purpose === "corpus");
  const hasReadyCorpus = corpusDocs.some((d) => d.status === "ready");

  const { data: latestSession, error: latestSessionError } = await supabase
    .from("chat_sessions")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSessionError) {
    console.error("Failed to load latest chat session", latestSessionError);
  }

  let initialMessages: ChatMessageView[] = [];
  const initialSessionId = latestSession?.id ?? null;

  if (initialSessionId) {
    const { data: rows, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_session_id", initialSessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to load chat messages", messagesError);
    } else {
      const allChunkIds = [
        ...new Set((rows ?? []).flatMap((m) => m.cited_chunk_ids ?? [])),
      ];
      let citationsByChunkId = new Map<
        string,
        Awaited<ReturnType<typeof resolveCitations>>[number]
      >();
      try {
        const citations = await resolveCitations(supabase, allChunkIds);
        citationsByChunkId = new Map(citations.map((c) => [c.chunk_id, c]));
      } catch (err) {
        console.error("Failed to resolve citations for chat history", err);
      }

      initialMessages = (rows ?? []).map((message) => ({
        message,
        citations: (message.cited_chunk_ids ?? [])
          .map((id) => citationsByChunkId.get(id))
          .filter(
            (c): c is NonNullable<typeof c> => c !== undefined
          ),
      }));
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col gap-6 p-6 lg:flex-row">
      <section className="w-full space-y-6 lg:max-w-sm lg:shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clarion</h1>
          <p className="text-sm text-muted-foreground">
            Upload documents for chat or comparison.
          </p>
        </div>

        <DocumentUpload />

        <div className="space-y-3">
          <h2 className="text-sm font-medium">Documents</h2>
          <DocumentList documents={documents ?? []} />
        </div>
      </section>

      <ChatPanel
        initialSessionId={initialSessionId}
        initialMessages={initialMessages}
        hasReadyCorpus={hasReadyCorpus}
      />
    </main>
  );
}
