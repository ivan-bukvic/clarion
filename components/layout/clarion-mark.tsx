import Image from "next/image";
import { cn } from "@/lib/utils";

export function ClarionMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative size-8 shrink-0", className)}
    >
      <Image
        src="/clarion-logo.png"
        alt=""
        fill
        sizes="96px"
        className="object-contain"
        priority
      />
    </div>
  );
}
