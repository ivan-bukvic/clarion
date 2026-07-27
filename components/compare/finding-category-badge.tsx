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
    "bg-[#E1F0EC] text-[#1F6F5C] dark:bg-emerald-500/15 dark:text-emerald-300",
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
