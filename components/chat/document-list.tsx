import { FileText, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/supabase";

type DocumentRow = Tables<"documents">;

export const documentStatusVariant: Record<
  DocumentRow["status"],
  "secondary" | "default" | "destructive"
> = {
  processing: "secondary",
  ready: "default",
  failed: "destructive",
};

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
        <Inbox className="text-muted-foreground size-5" />
        <p className="text-muted-foreground text-sm">
          Upload a document to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="clarion-panel divide-y">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-start justify-between gap-3 px-3 py-3"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">{doc.title}</p>
              <p className="text-muted-foreground truncate text-xs">
                {doc.source_file} · {doc.file_type.toUpperCase()} ·{" "}
                {doc.purpose}
              </p>
            </div>
          </div>
          <Badge variant={documentStatusVariant[doc.status]}>
            {doc.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
