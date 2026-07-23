# CLARION

Product Master Specification

|             |                                                                           |
| ----------- | ------------------------------------------------------------------------- |
| **Version** | 1.0 — Initial scope                                                       |
| **Status**  | Planning                                                                  |
| **Stack**   | Next.js 15 · Supabase (incl. pgvector) · Claude API / OpenAI · TypeScript |
| **Hosting** | Vercel                                                                    |
| **Date**    | 2026                                                                      |

**PORTFOLIO PROJECT — NOT FOR PRODUCTION USE**

---

## 1. Product Vision

Clarion is a portfolio demo project: an AI document intelligence tool that proves two connected capability patterns on top of the same document-processing foundation — (1) RAG chat with citation-backed answers over uploaded documents, and (2) structured document comparison that outputs a polished Word report.

**This is not a product meant for real users.** The goal is a convincing, honest, working demo — portfolio screenshots of both features plus a live deployed URL — that can be referenced directly in proposals ("I built something similar to this"). **Updated per `PROJECT_MEMORY.md` Amandman v1.1:** the original plan called for two short Loom recordings; the deliverable is now static screenshots instead, which is why the app chrome carries more of the "real client" context (see `FRONTEND_MASTER.md` §11 and §17).

### Why this project (context)

Respondly proved WhatsApp + RAG + HITL + MCP. Clarion targets a different, equally common cluster of Upwork AI Automation jobs: "chat with your documents," contract/quote comparison, and AI-generated Word/PDF reports — capability gaps not covered by the existing portfolio (FlowOps, Wellora, Savio, Optilium, Gallebo, AI Knowledge Workspace, AI Meeting Intelligence, Respondly).

- **RAG over uploaded files (not a connected knowledge base)** — appears across listings asking for "chat with our contracts/policies/reports," where the client uploads files directly rather than linking Notion/Drive.
- **Document comparison / redlining** — explicitly requested in listings comparing quotes, contracts, or proposal versions and flagging differences.
- **AI-generated Word output** — several listings ask for a generated report or document as the deliverable, not just a chat answer — a distinct technical skill (structured DOCX generation) not yet demonstrated in the portfolio.

Decision: one combined project (shared parsing/RAG foundation, two features built on top) instead of two smaller ones — the comparison feature reuses the same document parsing and chunking pipeline as the RAG chat feature, so the second feature is a small incremental build on the first, not a second project.

## 2. Fictional Business

**Ridgeline Renovations** — a small general contracting / home renovation business. Chosen because quote comparison is a natural, visually legible use case (line items, prices, scope, timelines) that makes AI-identified differences obviously meaningful rather than trivial diffing, and because "chat with your project documents" (specs, permits, prior quotes) is a believable daily need for a small contractor without an internal knowledge management system.

Source content (`/demo-documents`):

- Two realistic vendor quotes for a kitchen remodel (`quote-a-summit-contracting.pdf`, `quote-b-northline-builders.pdf`) — used for the comparison feature demo
- A small set of project documents for the RAG chat corpus: scope of work, material spec sheet, permit application, and a prior vendor quote — realistic, not lorem ipsum

## 3. Users & Roles

Clarion is single-tenant and single-user for demo purposes — there is no organization model, no multi-tenancy, and no role system. This is a deliberate scope reduction from a real product.

| Role     | Access                                         | Purpose                                                                         |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| **User** | Full access to the app (single seeded account) | Uploads documents, runs RAG chat, runs comparisons, downloads generated reports |

## 4. Tech Stack

### Frontend

| Technology                        | Role                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| Next.js 15 (App Router)           | App shell + API routes (upload, chat, comparison, report generation) |
| TypeScript                        | Type safety                                                          |
| Tailwind CSS                      | Styling                                                              |
| shadcn/ui                         | Component library — no custom design system from scratch             |
| Claude Code (post-backend polish) | UI/component refinement pass, same repo — see §12                    |

### Backend

| Technology                       | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| Supabase (Postgres)              | Database, Auth (single seeded user), Storage (uploaded source files) |
| Supabase pgvector                | Vector store for RAG — no separate vector DB                         |
| Claude API (Anthropic) or OpenAI | Response generation, comparison analysis, embeddings                 |
| `pdf-parse` / `mammoth` (npm)    | PDF and DOCX text extraction                                         |
| `docx` (npm)                     | Generated Word report output                                         |

### Hosting & External Services

| Service            | Provider                                         | Purpose                                   |
| ------------------ | ------------------------------------------------ | ----------------------------------------- |
| App hosting        | Vercel                                           | Next.js deployment, public demo URL       |
| Database & storage | Supabase Cloud                                   | Postgres + pgvector + Auth + file storage |
| LLM                | Anthropic Claude API (or OpenAI, TBD at Phase 0) | RAG generation, comparison analysis       |

> **Architecture note:** Clarion follows the same "one backend" principle established in `Respondly`: everything — document parsing, RAG, comparison logic, DOCX generation — runs inside the same Next.js app on Vercel. No separate Python/FastAPI service, no separate microservice for document processing. See `PROJECT_MEMORY.md` for the full architecture lock and rationale. Frontend polish happens later in a dedicated Claude Code pass, working directly in the same repo — see §12.

## 5. Database Entities (high-level)

| Table                 | Core Fields                                                          | Description                                                                                                  |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `documents`           | id, title, source_file, file_type, purpose, created_at               | One row per uploaded file — `purpose` distinguishes `corpus` (RAG chat) vs `comparison` (comparison feature) |
| `document_chunks`     | id, document_id, heading, content, embedding (vector)                | Chunked, embedded document content — the RAG corpus                                                          |
| `chat_sessions`       | id, created_at                                                       | One per chat conversation (single-user scope, mostly for grouping messages)                                  |
| `chat_messages`       | id, chat_session_id, role, content, cited_chunk_ids, created_at      | Chat turns, with source citations attached to assistant messages                                             |
| `comparisons`         | id, document_a_id, document_b_id, status, created_at                 | One row per comparison run                                                                                   |
| `comparison_findings` | id, comparison_id, category, description, source_a_ref, source_b_ref | Individual identified differences/discrepancies                                                              |
| `generated_reports`   | id, comparison_id, file_url, created_at                              | The generated `.docx` report for a comparison                                                                |

Full schema detail lives in `BACKEND_MASTER.md`.

## 6. Core Modules (the 2 things this project must prove)

### 6.1 RAG Chat Over Uploaded Documents

User uploads one or more PDF/DOCX/TXT files. Each is parsed, chunked, and embedded into `document_chunks`. The chat interface answers questions grounded in retrieved chunks and cites which document/section each answer draws from — never a bare answer with no citation. If a question isn't covered by the uploaded corpus, the assistant says so rather than guessing.

### 6.2 Document Comparison + Word Report

User uploads exactly two documents (e.g., two contractor quotes). The system parses both, identifies differences, missing items, and mismatches (pricing, scope, timelines, terms), and generates a structured `.docx` report — title, summary, and a differences table — clean and professional, not a full brand-matching template (see §7).

Both modules share the same parsing/chunking foundation (§12 in `BACKEND_MASTER.md`); the comparison feature is a focused extension of the RAG chat foundation, not a separate pipeline.

## 7. Deliberately Out of Scope

- Connecting external sources (Notion, Google Drive, GitHub) — file upload only is sufficient for a portfolio demo
- Enterprise integrations (Slack, Jira, HubSpot)
- Full brand-matching Word template (exact colors, logo in header) — a clean, structured report is enough
- Multi-language support
- Complex analytics dashboard
- Custom UI design from scratch — shadcn/Tailwind defaults, refined in a dedicated Claude Code polish pass
- Multi-tenancy, roles beyond a single user
- Comparing more than two documents at once
- Real-time collaborative chat or multi-user sessions

## 8. Time & Quality Bar

Target: 5–7 focused working days — roughly 2–3 days for the RAG chat feature, 2–3 days for comparison + DOCX generation (the technically heavier half, since formatted DOCX generation reliably takes longer than it looks), plus polish/deploy/demo time. Priority order: functionality first, then a clean and modern but simple UI (backend build in Cursor, then a dedicated Claude Code UI polish pass — see §12), no polish beyond that. The end goal is proof of two working patterns a prospective client can see and trust, not a product real clients would use.

## 9. Demo & Portfolio Requirements

These directly affect what "done" looks like for each module — see `EXECUTION_PHASES.md` for where they land in the build order.

- **Portfolio screenshots** (Amandman v1.1 — replaces the original two-Loom-recording plan): clear screenshots covering (1) upload documents → RAG chat with a visible citation, (2) upload two documents → generated Word report with findings, plus the dashboard/sidebar chrome (see `FRONTEND_MASTER.md` §17) that gives the screenshots more real-client context now that there's no video narration
- Deployed to a **real URL** (Vercel), optionally behind a basic password
- **Realistic placeholder documents** — real-sounding contractor quotes and project documents, not lorem ipsum or "test test test"
- The generated Word report must look clean and professional — this is the artifact a client remembers most, so it gets disproportionate polish attention relative to its build complexity
- A short **README** covering how to run it, the architecture, the Cursor → Claude Code UI polish workflow used, and what would change for a real client
- **Transparency in proposals**: disclosed as a demo/portfolio build, with the architecture presented as identical to what a client would receive, adapted to their own documents and report template. Without Loom narration to state this out loud, the README and portfolio case-study text carry that disclosure explicitly (see `PROJECT_MEMORY.md` Demo Integrity Rule)

**What NOT to do:** fake user counts, invented testimonials, or implying a real client exists behind this — same rule as every other portfolio project.

## 10. Implementation Priority

| #   | Module                                                                              | Notes                                                         |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Fictional business & demo documents                                                 | Ridgeline Renovations — 2 vendor quotes + 4 project documents |
| 2   | Document upload + parsing + chunking foundation                                     | Shared by both features — build once                          |
| 3   | RAG pipeline (embeddings + retrieval + generation)                                  | Core value #1                                                 |
| 4   | Chat interface with citations                                                       | Core value #1, UI half                                        |
| 5   | Comparison logic (two-document diff analysis)                                       | Core value #2                                                 |
| 6   | DOCX report generation                                                              | Core value #2, technically heaviest                           |
| 7   | Backend build complete → dedicated Claude Code pass for frontend polish (same repo) | See §12; polish pass now also covers dashboard/sidebar chrome, see `FRONTEND_MASTER.md` §17 |
| 8   | Demo polish (branding, README, deploy)                                              | Makes it look like a real product                             |
| 9   | Portfolio screenshots + case study                                                   | Amandman v1.1 — replaces the original Loom recordings; the actual proposal-ready deliverable |

Full phase breakdown with exit criteria: see `EXECUTION_PHASES.md`.

## 11. Open Questions / Future Scope

| #   | Topic                                                  | Status                                                                                                                           |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Claude API vs OpenAI for generation + embeddings       | To be decided during Phase 0 — either works, pick one and stay consistent between ingestion and query per `BACKEND_MASTER.md` §5 |
| 2   | Support for comparing more than 2 documents            | Explicitly out of scope for MVP — noted here in case a future variant is worth pricing separately                                |
| 3   | Full brand-matching DOCX template (client logo/colors) | Out of scope for MVP — would be a real-client customization, not a demo requirement                                              |

## 12. Frontend Workflow — Cursor → Claude Code (UI Polish Pass)

Backend logic (parsing, RAG, comparison, DOCX generation, API routes) is built first in Cursor. Once the backend is functional end-to-end (even with a bare-bones UI), a **dedicated Claude Code session** works directly in the same repo — no GitHub import/export step, no second tool — for a focused UI/component polish pass.

**Rule:** during the polish pass, only touch UI/component files and page-level presentation — never backend routes, API logic, or database/schema code. Unlike an external tool with its own sandboxed import, Claude Code has full repo access, so this boundary is **self-imposed discipline, not a technical constraint** — treat it as strictly as if it were enforced. Review the git diff after each polish session before committing, and reject anything touching `app/api/`, `lib/`, or schema/migration files.

Full workflow detail: see `EXECUTION_PHASES.md` and `FRONTEND_MASTER.md` §1.

---

_Clarion · Product Master · v1.0 · Portfolio Project_
