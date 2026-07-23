import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/rag/citations";

export function CitationBadge({ citation }: { citation: Citation }) {
  const label = citation.heading
    ? `${citation.document_title} · ${citation.heading}`
    : citation.document_title;

  return (
    <Badge variant="secondary" className="max-w-full truncate font-normal">
      {label}
    </Badge>
  );
}
