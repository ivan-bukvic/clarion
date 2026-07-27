import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Library,
  ShieldCheck,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClarionMark } from "@/components/layout/clarion-mark";
import { FaqAccordion } from "@/components/landing/faq-accordion";

export const metadata: Metadata = {
  title: "Clarion — Ask your documents. Get answers you can verify.",
  description:
    "Clarion reads a company's own documents and answers questions with citations back to the source, or lines up two quotes side by side and writes the findings report for you.",
};

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#why", label: "Why Clarion" },
  { href: "#faq", label: "FAQ" },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Upload documents",
    desc: "Add a project corpus for chat, or two quotes to compare, directly from your files.",
  },
  {
    n: "2",
    title: "Ask or compare",
    desc: "Ask questions in plain language, or run a structured comparison between two documents.",
  },
  {
    n: "3",
    title: "Get cited answers",
    desc: "Every chat answer links to its source. Every comparison produces a findings report.",
  },
  {
    n: "4",
    title: "Download or continue",
    desc: "Export the report as a Word document, or keep chatting to dig into the details.",
  },
] as const;

const WHY_ITEMS = [
  {
    title: "Grounded answers only",
    desc: "No invented facts. Every answer is backed by a citation to the exact source passage.",
    icon: ShieldCheck,
  },
  {
    title: "Any document library",
    desc: "Works across contracts, quotes, specs, and reports without retraining.",
    icon: Library,
  },
  {
    title: "Comparison reports in seconds",
    desc: "Line up two vendor quotes and get a structured findings table, not a wall of text.",
    icon: Table2,
  },
  {
    title: "Built to extend",
    desc: "Adapts to your document workflow, whatever contracts, quotes, or reports you work with.",
    icon: Sparkles,
  },
] as const;

export default function LandingPage() {
  return (
    <div className="bg-background w-full overflow-hidden text-[#16211D]">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 sm:px-14">
        <Link href="/" className="flex items-center gap-2.5">
          <ClarionMark className="size-[34px]" />
          <span className="font-heading text-[19px] font-extrabold tracking-[-0.02em] text-[#16211D]">
            Clarion
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-primary text-sm font-medium text-[#3A423D]"
            >
              {link.label}
            </a>
          ))}
          <Button
            asChild
            size="sm"
            className="rounded-lg px-[18px] text-[13.5px]"
          >
            <Link href="/login">Get started</Link>
          </Button>
        </nav>
        <Button
          asChild
          size="sm"
          className="rounded-lg px-[18px] text-[13.5px] md:hidden"
        >
          <Link href="/login">Get started</Link>
        </Button>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-[1280px] px-6 pt-16 pb-20 sm:px-14 sm:pt-[76px] sm:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[120px] -right-[160px] size-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(226,114,76,0.14), transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-[140px] size-[380px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(31,111,92,0.10), transparent 70%)",
          }}
        />

        <div className="relative flex max-w-[760px] flex-col items-start">
          <div className="border-border bg-card shadow-clarion-sm mb-[26px] flex items-center gap-2 rounded-full border px-3.5 py-[7px]">
            <span className="size-[7px] shrink-0 rounded-full bg-[#E2724C]" />
            <span className="text-[12.5px] font-semibold tracking-[0.03em] text-[#4A524C]">
              RAG CHAT &nbsp;+&nbsp; DOCUMENT COMPARISON
            </span>
          </div>

          <h1 className="font-heading text-[40px] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#16211D] sm:text-[58px] sm:leading-[1.05]">
            Ask your documents.
            <br />
            Get answers <span className="text-primary">you can verify.</span>
          </h1>

          <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-[#5B635D]">
            Clarion reads a company&apos;s own documents and answers questions
            with citations back to the source, or lines up two quotes side by
            side and writes the findings report for you.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Button
              asChild
              size="lg"
              className="shadow-clarion-btn rounded-[10px] px-[26px] text-[15px]"
            >
              <Link href="/login">
                Get started
                <ArrowRight className="size-[15px]" strokeWidth={2.4} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-input shadow-clarion-sm rounded-[10px] border-[1.5px] px-[26px] text-[15px] text-[#2A322D]"
            >
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>

        {/* decorative citation mockup */}
        <div className="border-border bg-card shadow-clarion-lg relative mt-16 max-w-[640px] rounded-[18px] border p-7 sm:p-8">
          <div className="mb-3.5 flex justify-end">
            <div className="bg-clarion-gradient max-w-[70%] rounded-[12px_12px_2px_12px] px-4 py-2.5 text-sm text-white">
              What&apos;s the estimated completion timeline?
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="rounded-[12px_12px_12px_2px] bg-[#FAF8F3] px-4 py-3 text-sm leading-[1.5] text-[#1C2420]">
              The estimated completion timeline is 6 weeks from the start date,
              weather and permit approval permitting.
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-[#E5F1EC] px-2.5 py-1 text-[11.5px] font-semibold text-[#1F6F5C]">
                scope-of-work.pdf
              </span>
              <span className="rounded-full bg-[#FBE7DE] px-2.5 py-1 text-[11.5px] font-semibold text-[#C85A38]">
                prior-vendor-quote.pdf
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="mx-auto max-w-[1280px] px-6 py-20 sm:px-14 sm:py-[100px]"
      >
        <div className="mb-[52px]">
          <div className="mb-2.5 text-[12.5px] font-bold tracking-[0.1em] text-[#E2724C]">
            HOW IT WORKS
          </div>
          <h2 className="font-heading max-w-[560px] text-[32px] font-extrabold tracking-[-0.02em] text-[#16211D] sm:text-[38px]">
            From upload to answer, in one flow.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="border-border bg-card shadow-clarion-md rounded-2xl border p-[26px_22px]"
            >
              <div className="font-heading bg-clarion-gradient mb-[18px] flex size-[38px] items-center justify-center rounded-lg text-[15px] font-extrabold text-white">
                {step.n}
              </div>
              <div className="mb-2 text-base font-bold text-[#16211D]">
                {step.title}
              </div>
              <div className="text-muted-foreground text-[13.5px] leading-[1.55]">
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY CLARION */}
      <section
        id="why"
        className="bg-clarion-sidebar-gradient relative overflow-hidden px-6 py-20 sm:px-14 sm:py-[100px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-[340px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(226,114,76,0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1280px]">
          <div className="mb-2.5 text-[12.5px] font-bold tracking-[0.1em] text-[#E2946F]">
            WHY CLARION
          </div>
          <h2 className="font-heading mb-[52px] max-w-[640px] text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
            Built to earn trust before it earns a contract.
          </h2>

          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_ITEMS.map((item) => (
              <div key={item.title}>
                <div className="mb-4 flex size-9 items-center justify-center rounded-[9px] bg-[#E2724C]/[0.16]">
                  <item.icon
                    className="size-[18px] text-[#E2946F]"
                    strokeWidth={2}
                  />
                </div>
                <div className="mb-2 text-[15.5px] font-bold text-white">
                  {item.title}
                </div>
                <div className="text-[13.5px] leading-[1.6] text-[#9FC2BA]">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-[900px] px-6 py-20 sm:px-14 sm:py-[100px]"
      >
        <div className="mb-2.5 text-[12.5px] font-bold tracking-[0.1em] text-[#E2724C]">
          FAQ
        </div>
        <h2 className="font-heading mb-11 text-[32px] font-extrabold tracking-[-0.02em] text-[#16211D] sm:text-[38px]">
          Common questions.
        </h2>

        <FaqAccordion />
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto max-w-[1280px] px-6 pb-20 sm:px-14 sm:pb-20">
        <div className="bg-clarion-coral-gradient shadow-clarion-lg relative overflow-hidden rounded-3xl p-10 sm:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -bottom-20 size-[280px] rounded-full bg-white/[0.08]"
          />
          <div className="relative flex max-w-[640px] flex-col items-start">
            <h2 className="font-heading mb-3.5 text-[28px] font-extrabold tracking-[-0.02em] text-white sm:text-[34px]">
              See it running on a real workflow.
            </h2>
            <p className="mb-[30px] text-[15.5px] leading-[1.6] text-white/90">
              See how a renovation company uses Clarion to manage vendor quotes
              and project documents, from upload to a cited answer.
            </p>
            <Button
              asChild
              size="lg"
              className="rounded-[10px] bg-white px-[26px] text-[15px] font-bold text-[#C85A38] shadow-lg hover:bg-white/90"
            >
              <Link href="/login">Try it now</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-border mx-auto flex max-w-[1280px] items-center justify-between border-t px-6 py-8 sm:px-14">
        <div className="flex items-center gap-2.5">
          <ClarionMark className="size-[22px]" />
          <span className="font-heading text-sm font-bold text-[#3A423D]">
            Clarion
          </span>
        </div>
        <span className="text-[12.5px] text-[#9A948A]">
          Built for Ridgeline Renovations.
        </span>
      </footer>
    </div>
  );
}
