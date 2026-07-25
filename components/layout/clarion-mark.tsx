import { cn } from "@/lib/utils";

export function ClarionMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground",
        className
      )}
    >
      C
    </div>
  );
}
