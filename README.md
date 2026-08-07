# Clarion

Portfolio/demo project — AI document chat with source citations, and AI-driven document comparison with a generated Word report. **Not a product for real users and not client work** — an honest capability demo for proposals. See `docs/PROJECT_MEMORY.md` (Demo Integrity Rule).

## Stack

Next.js 16 (App Router, TypeScript, Tailwind, shadcn/ui) · Supabase (Postgres + pgvector + Auth + Storage) · Anthropic Claude API (generation) · Voyage AI (embeddings, `voyage-3-lite`) · `pdf-parse` / `mammoth` (parsing) · `docx` (report generation)

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in:
   - Supabase project URL + anon key + service role key (create a project at supabase.com, enable the `pgvector` extension)
   - `ANTHROPIC_API_KEY` (console.anthropic.com)
   - `VOYAGE_API_KEY` (dash.voyageai.com)
   - Optional for local: leave `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` empty (curtain stays off)
3. Apply Supabase migrations from `supabase/migrations/` to your project
4. `npm run dev` — app runs at `localhost:3000`
5. Sign in with the seeded Supabase Auth user

Demo files for manual testing live in `demo-documents/` (two comparison quotes + four RAG corpus documents). Suggested chat questions: `demo-documents/rag-test-questions.md`.

## Architecture

One Next.js app serves frontend, API routes, and RAG orchestration — no separate backend service. RAG chat and document comparison share the same parsing/chunking pipeline (`lib/documents/`, `documents`, `document_chunks`) and Supabase pgvector store. Full rationale in `docs/PROJECT_MEMORY.md` (Architecture Lock) and `docs/BACKEND_MASTER.md` §1–2.

### Frontend workflow

Backend and a minimal functional UI were built in Cursor (phases 0–4). UI polish was a separate **Claude Code** pass in the same repo that touched only presentation (`components/`, page layouts, `globals.css`) — never `app/api/*` or `lib/*`. See `docs/FRONTEND_MASTER.md` §14 and `docs/phases/faza_5_brief.md`.

## Deploy (Vercel)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set Environment Variables (Production) to match `.env.local.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
   - `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` (both required for the edge curtain; setting only one disables it and logs a warning). `BASIC_AUTH_USER` must not contain a `:` — credentials are split on the first colon per RFC 7617, so a colon in the username breaks every login attempt.
   - `CRON_SECRET` (keep-alive cron secret — prevents Supabase free-plan auto-pause; Vercel sends it as `Authorization: Bearer <value>` to `/api/cron/keep-alive` daily)
3. Deploy. Framework preset: Next.js. Hobby plan `maxDuration` for comparison is capped at 60s (see Known limitations).
4. Open the public URL → Basic-Auth prompt (if configured) → Clarion `/login` → seeded user
5. Smoke-test on production: upload a corpus doc → chat with a citation; upload two quotes → compare → download Word report

## Known limitations (demo vs production)

These are intentional demo-scope choices, not unfinished work. For a real client the same architecture would change in these places:

- **Full-document-in-prompt comparison.** Comparison quality depends on seeing both documents in full, and demo quotes are short enough to fit comfortably in context. Longer real-world documents would need chunked/retrieval-based comparison — see `docs/BACKEND_MASTER.md` §7 Scale note.
- **DOCX report generation via `after()`.** Comparison findings return as soon as they are saved; the Word report is built afterward in the same serverless invocation. If the LLM call itself is pathologically slow, the background task can still be cut off at the Hobby `maxDuration` limit — the UI keeps a Retry button available while the report is pending. A production system would use a real background job.
- **Narrow report-retry race windows.** A few edge races remain in client retry/status handling. Acceptable for this single-user demo; a production build would tighten with request cancellation and stronger server-side status ownership.
- **Brand-matched Word template.** The generated DOCX is clean and structured (title, summary, findings table) but is not a full client brand template (exact colors, logo in header). That would be the main customization for a real engagement.
- **Two documents only.** Multi-document comparison and richer multi-file corpus UX are out of scope for this portfolio demo.

## Project docs

All product/architecture/security specs live in `docs/`. Start with `docs/MASTER_PROMPT.md`, then `docs/PROJECT_MEMORY.md` for locked decisions. Phase-by-phase build plan: `docs/EXECUTION_PHASES.md` and `docs/phases/faza_0_*.md` through `faza_7_*.md`.

## Status

Phases 0–5 complete. Phase 6 (demo polish + deploy prep) complete in-repo; public Vercel URL and production end-to-end checks are the remaining manual deploy steps (see Deploy above).
