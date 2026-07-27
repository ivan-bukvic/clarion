"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How is my data handled?",
    a: "Your documents are used only to answer your questions and generate your reports. Nothing is used to train shared models, and access is scoped to your organization.",
  },
  {
    q: "How does the citation system work?",
    a: "Every answer is generated only from retrieved passages in the uploaded documents, and each response links back to the specific source file so it can be checked in seconds.",
  },
  {
    q: "What file types are supported?",
    a: "Clarion accepts PDF, DOCX, and TXT files for both the chat corpus and document comparison.",
  },
  {
    q: "Can this be adapted to my documents?",
    a: "Yes. The underlying pipeline is document-agnostic. It's built to be pointed at a real client's contracts, quotes, or reports with minimal changes.",
  },
] as const;

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="border-border border-t">
      {FAQS.map((faq, index) => {
        const open = openIndex === index;
        return (
          <div key={faq.q} className="border-border border-b">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? -1 : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-5 px-1 py-[22px] text-left"
            >
              <span className="text-[16.5px] font-semibold text-[#16211D]">
                {faq.q}
              </span>
              <span className="bg-secondary flex size-[26px] shrink-0 items-center justify-center rounded-full">
                <Plus
                  className={cn(
                    "text-muted-foreground size-[13px] transition-transform duration-150",
                    open && "rotate-45"
                  )}
                  strokeWidth={2.4}
                />
              </span>
            </button>
            {open ? (
              <div className="text-muted-foreground max-w-[720px] px-1 pb-6 text-[14.5px] leading-[1.65]">
                {faq.a}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
