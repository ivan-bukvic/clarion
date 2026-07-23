"use client";

import type { Tables } from "@/types/supabase";
import { FindingCategoryBadge } from "@/components/compare/finding-category-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ComparisonRow = Tables<"comparisons">;
type FindingRow = Tables<"comparison_findings">;

type FindingsTableProps = {
  comparison: ComparisonRow;
  findings: FindingRow[];
  onRetry?: () => void;
  retrying?: boolean;
};

export function FindingsTable({
  comparison,
  findings,
  onRetry,
  retrying = false,
}: FindingsTableProps) {
  if (comparison.status === "failed") {
    return (
      <div className="space-y-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
        <div>
          <h2 className="text-sm font-medium text-destructive">
            Comparison failed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The analysis could not be completed. You can retry with the same
            documents.
          </p>
        </div>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry comparison"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Summary</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {comparison.summary ?? "No summary available."}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">
          Findings ({findings.length})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Document A</TableHead>
              <TableHead>Document B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((finding) => (
              <TableRow key={finding.id}>
                <TableCell className="align-top whitespace-normal">
                  <FindingCategoryBadge category={finding.category} />
                </TableCell>
                <TableCell className="max-w-md align-top whitespace-normal text-sm">
                  {finding.description}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm text-muted-foreground">
                  {finding.source_a_ref ?? "—"}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm text-muted-foreground">
                  {finding.source_b_ref ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
