import type { FindingCategory } from "@/lib/compare/findings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  price_difference: "Price difference",
  missing_item: "Missing item",
  scope_difference: "Scope difference",
  term_difference: "Term difference",
  other: "Other",
};

const CATEGORY_STYLES: Record<FindingCategory, string> = {
  price_difference:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  missing_item:
    "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-300",
  scope_difference:
    "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300",
  term_difference:
    "bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-300",
  other: "",
};

export function FindingCategoryBadge({
  category,
}: {
  category: FindingCategory;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(CATEGORY_STYLES[category])}
    >
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
