import type { FindingCategory } from "@/lib/compare/findings";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  price_difference: "Price difference",
  missing_item: "Missing item",
  scope_difference: "Scope difference",
  term_difference: "Term difference",
  other: "Other",
};

export function FindingCategoryBadge({
  category,
}: {
  category: FindingCategory;
}) {
  return (
    <Badge variant="secondary">{CATEGORY_LABELS[category]}</Badge>
  );
}
