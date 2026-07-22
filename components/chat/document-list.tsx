import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/supabase";

type DocumentRow = Tables<"documents">;

const statusVariant: Record<
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
      <p className="text-sm text-muted-foreground">
        Upload a document to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-start justify-between gap-3 px-3 py-3"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{doc.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {doc.source_file} · {doc.file_type.toUpperCase()} · {doc.purpose}
            </p>
          </div>
          <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
