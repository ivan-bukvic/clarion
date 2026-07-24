# Clarion

Portfolio/demo project — AI document chat with source citations, and AI-driven document comparison with a generated Word report. Not a product for real users; see `docs/PROJECT_MEMORY.md`.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind, shadcn/ui) · Supabase (Postgres + pgvector + Auth + Storage) · Anthropic Claude API (generation) · Voyage AI (embeddings, `voyage-3-lite`) · `pdf-parse` / `mammoth` (parsing) · `docx` (report generation)

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in:
   - Supabase project URL + anon key + service role key (create a project at supabase.com, enable the `pgvector` extension)
   - `ANTHROPIC_API_KEY` (console.anthropic.com)
   - `VOYAGE_API_KEY` (dash.voyageai.com)
3. `npm run dev` — app runs at `localhost:3000`

## Architecture

One Next.js app serves frontend, API routes, and RAG orchestration — no separate backend service. Full rationale in `docs/PROJECT_MEMORY.md` (Architecture Lock section) and `docs/BACKEND_MASTER.md` §1-2.

## Known limitations (demo vs production)

These are intentional demo-scope choices, not unfinished work. For a real client the same architecture would change in these places:

- **Full-document-in-prompt comparison.** Comparison quality depends on seeing both documents in full, and demo quotes are short enough to fit comfortably in context. Longer real-world documents would need chunked/retrieval-based comparison — see `docs/BACKEND_MASTER.md` §7 Scale note.
- **DOCX report generation via `after()`.** Comparison findings return as soon as they are saved; the Word report is built afterward in the same serverless invocation. If the LLM call itself is pathologically slow, the background task can still be cut off at the Hobby `maxDuration` limit — the UI keeps a Retry button available while the report is pending (not only after a definitive `failed` status) so the user can regenerate without re-running the comparison. A production system would use a real background job; that is out of scope for this portfolio demo.
- **Narrow report-retry race windows.** A few edge races remain in client retry/status handling (stale mid-flight updates across rapid comparison switches, brief UI/status skew while a synchronous regenerate runs). Acceptable for this single-user demo; a production build would tighten with request cancellation tokens and stronger server-side status ownership.

## Project docs

All product/architecture/security specs live in `docs/`. Start with `docs/MASTER_PROMPT.md`, then `docs/PROJECT_MEMORY.md` for locked decisions. Phase-by-phase build plan: `docs/EXECUTION_PHASES.md` and `docs/phases/faza_0_*.md` through `faza_7_*.md`.

## Status

Faza 0 (setup) in progress — see `docs/phases/faza_0_setup_tech_stack.md` checklist for exact state.
