import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DocumentUpload } from "@/components/chat/document-upload";
import { DocumentList } from "@/components/chat/document-list";

export default async function ChatPage() {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    redirect("/login");
  }

  const supabase = createServiceRoleClient();
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load documents", error);
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

      <section className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Chat comes in Phase 2.
        </p>
      </section>
    </main>
  );
}
