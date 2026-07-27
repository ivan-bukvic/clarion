import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatPreviewItem = {
  question: string;
  answer: string;
  badges: readonly string[];
};

const BADGE_TONES = [
  { bg: "bg-[#E5F1EC]", text: "text-[#1F6F5C]" },
  { bg: "bg-[#FBE7DE]", text: "text-[#C85A38]" },
] as const;

export function ChatPreview({
  items,
  showInput = false,
  className,
}: {
  items: readonly ChatPreviewItem[];
  showInput?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card shadow-clarion-lg relative rounded-[18px] border p-7 sm:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div key={item.question}>
            <div className="mb-3.5 flex justify-end">
              <div className="bg-clarion-gradient max-w-[70%] rounded-[12px_12px_2px_12px] px-4 py-2.5 text-sm text-white">
                {item.question}
              </div>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="rounded-[12px_12px_12px_2px] bg-[#FAF8F3] px-4 py-3 text-sm leading-[1.5] text-[#1C2420]">
                {item.answer}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.badges.map((badge, badgeIndex) => {
                  const tone = BADGE_TONES[badgeIndex % BADGE_TONES.length];
                  return (
                    <span
                      key={badge}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                        tone.bg,
                        tone.text
                      )}
                    >
                      {badge}.pdf
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showInput ? (
        <div className="border-input bg-background mt-6 flex items-center gap-3 rounded-full border px-5 py-3">
          <span className="text-muted-foreground flex-1 text-sm">
            Ask about your documents...
          </span>
          <span className="bg-clarion-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-white">
            <Send className="size-[14px]" strokeWidth={2.4} />
          </span>
        </div>
      ) : null}
    </div>
  );
}
