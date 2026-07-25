import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/rag/citations";

export function CitationBadge({ citation }: { citation: Citation }) {
  const label = citation.heading
    ? `${citation.document_title} · ${citation.heading}`
    : citation.document_title;

  return (
    <Badge
      variant="secondary"
      className="max-w-full min-w-0 truncate font-normal"
      title={label}
    >
      <FileText className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}
