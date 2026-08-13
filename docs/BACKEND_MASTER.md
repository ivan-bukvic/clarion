# CLARION

## BACKEND MASTER — v1.0

> **THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR:**
>
> - Database schema
> - Document parsing & ingestion
> - RAG pipeline (ingestion + retrieval)
> - Comparison logic
> - DOCX report generation
> - Auth
> - Query/mutation contracts
> - Environment variables

---

## 1. BACKEND CONTEXT

The backend supports exactly two flows, both built on the same foundation:

```
Flow A (RAG chat):
Documents uploaded → parsed, chunked, embedded → chat query embedded →
top-k retrieval → grounded answer with citations

Flow B (Comparison):
Two documents uploaded → parsed, chunked, embedded (same pipeline as Flow A) →
AI comparison analysis → structured findings → DOCX report generated
```

Everything else is scaffolding around those two flows. There is no multi-tenancy, no organization model, and no role system beyond a single user.

### What the backend is NOT

- Not a multi-tenant SaaS backend
- Not a general-purpose document management platform
- Not an enterprise RAG system — a handful of demo documents is the entire corpus at any time

### What the backend IS

- A lightweight Supabase-first backend
- A thin orchestration layer around an LLM API (Claude or OpenAI)
- A single Postgres database doing double duty as the relational store AND the vector store (pgvector)
- Two features sharing one parsing/chunking foundation

---

## 2. OFFICIAL BACKEND STACK

| Layer            | Technology                                                                          |
| ---------------- | ----------------------------------------------------------------------------------- |
| Database         | Supabase Postgres                                                                   |
| Vector store     | Supabase pgvector (same database, no separate service)                              |
| File storage     | Supabase Storage (uploaded source documents)                                        |
| Auth             | Supabase Auth (single seeded user)                                                  |
| LLM              | Anthropic Claude API (or OpenAI — pick one at Phase 0, see `PRODUCT_MASTER.md` §11) |
| Document parsing | `pdf-parse` (PDF), `mammoth` (DOCX), native read (TXT)                              |
| DOCX generation  | `docx` (npm)                                                                        |
| Hosting          | Vercel (Next.js handles both frontend and all backend logic — no separate service)  |

### FORBIDDEN

Do not introduce:

- A separate vector database (Pinecone, Weaviate, etc.) — pgvector is sufficient at this scale
- A separate microservice for parsing, RAG, comparison, or DOCX generation — everything runs inside the Next.js app
- Prisma, NestJS, Express, Redis — Supabase client + Next.js API routes are enough
- Python/FastAPI as a second backend service, even though Python has strong document-processing libraries — see `PROJECT_MEMORY.md` for the "one backend" rationale
- Any multi-tenant scaffolding (`organization_id`, RLS-by-org, etc.) — there is exactly one user

---

## 3. DATABASE SCHEMA

### `documents`

| Field        | Type               | Notes                                                        |
| ------------ | ------------------ | ------------------------------------------------------------ |
| id           | uuid               | PK                                                           |
| title        | text               | e.g. "Summit Contracting — Kitchen Remodel Quote"            |
| source_file  | text               | Original filename                                            |
| file_type    | document_file_type | enum: `pdf`, `docx`, `txt`                                   |
| purpose      | document_purpose   | enum: `corpus` (RAG chat), `comparison` (comparison feature) |
| storage_path | text               | Path in Supabase Storage                                     |
| created_at   | timestamptz        |                                                              |

### `document_chunks`

**The RAG corpus (shared by both features).**

| Field       | Type         | Notes                                                        |
| ----------- | ------------ | ------------------------------------------------------------ |
| id          | uuid         | PK                                                           |
| document_id | uuid         | FK → documents                                               |
| heading     | text         | Section heading or page label the chunk was split on         |
| content     | text         | Chunk text                                                   |
| embedding   | vector(1536) | pgvector column; dimension depends on embedding model chosen |
| created_at  | timestamptz  |                                                              |

Chunking strategy: for documents with clear headings (markdown, structured DOCX), split on headings. For unstructured PDFs (e.g. scanned-style quotes), fall back to fixed-size chunking with modest overlap. See §5.

### `chat_sessions`

| Field      | Type        | Notes |
| ---------- | ----------- | ----- |
| id         | uuid        | PK    |
| created_at | timestamptz |       |

### `chat_messages`

| Field           | Type         | Notes                                                                                 |
| --------------- | ------------ | ------------------------------------------------------------------------------------- |
| id              | uuid         | PK                                                                                    |
| chat_session_id | uuid         | FK → chat_sessions                                                                    |
| role            | message_role | enum: `user`, `assistant`                                                             |
| content         | text         |                                                                                       |
| cited_chunk_ids | uuid[]       | nullable — populated on assistant messages, empty if retrieval found nothing relevant |
| created_at      | timestamptz  |                                                                                       |

### `comparisons`

**Core comparison table.**

| Field         | Type              | Notes                                                    |
| ------------- | ----------------- | -------------------------------------------------------- |
| id            | uuid              | PK                                                       |
| document_a_id | uuid              | FK → documents                                           |
| document_b_id | uuid              | FK → documents                                           |
| status        | comparison_status | enum: `processing`, `completed`, `failed`                |
| summary       | text              | nullable — short AI-generated overview of the comparison |
| created_at    | timestamptz       |                                                          |
| completed_at  | timestamptz       | nullable                                                 |

### `comparison_findings`

| Field         | Type             | Notes                                                                                    |
| ------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| id            | uuid             | PK                                                                                       |
| comparison_id | uuid             | FK → comparisons                                                                         |
| category      | finding_category | enum: `price_difference`, `missing_item`, `scope_difference`, `term_difference`, `other` |
| description   | text             | Human-readable finding, e.g. "Document B omits permit filing fee included in Document A" |
| source_a_ref  | text             | nullable — page/section reference in Document A                                          |
| source_b_ref  | text             | nullable — page/section reference in Document B                                          |

### `generated_reports`

| Field         | Type          | Notes                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------- |
| id            | uuid          | PK                                                                    |
| comparison_id | uuid          | FK → comparisons (unique)                                             |
| file_url      | text          | nullable until ready — Storage object path (not a public URL)         |
| status        | report_status | `pending` \| `ready` \| `failed` — lifecycle for async DOCX generation |
| error_message | text          | nullable — set when status = `failed`                                 |
| created_at    | timestamptz   | refreshed on regenerate                                               |

---

## 4. AUTH

Single seeded Supabase Auth user. No signup flow, no invite flow, no role table — this is a deliberate reduction from a real product's auth system.

```
1. User seeded manually in Supabase (or via a one-time setup script)
2. Login via Supabase Auth (email + password)
3. Next.js middleware (proxy.ts in Next.js 16+) protects /dashboard, /chat,
   /compare and /api/* — redirects unauthenticated page requests to /login;
   returns JSON 401 for unauthenticated /api/* calls
```

> **Napomena (avgust 2026):** optional Basic-Auth edge curtain that previously sat in front of the whole app was removed — the public demo URL is shared with prospective clients and Supabase Auth alone is the gate. See `SECURITY.md` §1.

---

## 5. DOCUMENT INGESTION (shared by both features)

Runs on every upload, regardless of `purpose` (`corpus` or `comparison`):

```
1. File uploaded to Supabase Storage
2. Insert into documents (file_type, purpose, storage_path)
3. Extract text:
   - PDF → pdf-parse
   - DOCX → mammoth
   - TXT → read directly
4. Chunk extracted text:
   - If clear heading structure detected → split on headings
   - Otherwise → fixed-size chunks (~500–800 tokens) with ~10% overlap
5. For each chunk:
   embedding = embed(chunk.content)
   insert into document_chunks
```

- Embedding model: any Anthropic-compatible or OpenAI embedding model works with pgvector; pick one and keep it consistent between ingestion and query time (mismatched models = broken retrieval)
- Documents with `purpose = comparison` still get chunked and embedded — the comparison feature reuses retrieval internally (§7) rather than passing raw full-text to the LLM for long documents

---

## 6. RAG PIPELINE — QUERY TIME (chat)

On each chat message:

```
1. embed(user_message)
2. similarity search against document_chunks WHERE document.purpose = 'corpus'
   (top-k, k=3–5, cosine distance)
3. build prompt: system instructions + retrieved chunks + chat history + user message
4. call LLM API → assistant response
5. insert into chat_messages (role = 'assistant', cited_chunk_ids = retrieved chunk ids)
```

### Prompt construction rule

The system prompt must instruct the model to answer **only** from retrieved chunks and to say it doesn't know rather than guessing if the chunks don't cover the question — this is what makes "citation-backed" a true claim in the demo, not just a UI label. Every assistant message must carry at least an empty `cited_chunk_ids` array; a response with no citations and no "I don't know" framing is a bug, not an acceptable fallback.

---

## 7. COMPARISON LOGIC

Triggered when a user selects exactly two `documents` rows (both `purpose = comparison`) and starts a comparison:

```
1. Insert into comparisons (status = 'processing')
2. Retrieve all document_chunks for both documents (full corpus for each,
   not top-k — a comparison needs the whole document, not a retrieval subset)
3. Build a structured prompt: system instructions + full content of Document A
   (grouped by heading) + full content of Document B (grouped by heading)
4. Call LLM API, instructed to return structured findings:
   { category, description, source_a_ref, source_b_ref }[]
   plus a short overall summary
5. Insert each finding into comparison_findings
6. Update comparisons.summary and status = 'completed'
7. Trigger DOCX generation (§8)
```

### Prompt construction rule

The comparison prompt must explicitly ask for price differences, missing line items, scope differences, and term differences as distinct categories (matching `finding_category`) — an unstructured "list the differences" prompt produces inconsistent output that's harder to render cleanly in both the UI and the generated report.

### Scale note

Full-document-in-prompt (rather than retrieval-based) is intentional here: comparison quality depends on seeing both documents in full, and demo documents are short enough (a few pages) that this fits comfortably in context. This would need chunked/retrieval-based comparison for much longer real-world documents — noted as a real-client difference in the README, not built here.

---

## 8. DOCX REPORT GENERATION

Triggered automatically when a comparison completes (§7). The API route
schedules generation via Next.js `after()` so `POST /api/compare` returns
as soon as findings are saved (`generated_reports.status = pending`); the
DOCX build/upload runs after the response is sent:

```
1. Insert generated_reports row with status = pending (synchronous, in runComparison)
2. after(): Fetch comparisons row + all comparison_findings for it
3. Build .docx using the `docx` npm package:
   - Title (document names being compared)
   - Summary paragraph (comparisons.summary)
   - Findings table (category, description, source A ref, source B ref)
4. Upload generated file to Supabase Storage
5. Upsert generated_reports (file_url, status = ready | failed)
```

- Clean, structured formatting — headings, a real table, readable spacing — not a full brand-matching template (no client logo/colors; see `PRODUCT_MASTER.md` §7)
- This is the single most-scrutinized output of the whole demo — allocate real polish time here even though it looks like "just formatting," per `PROJECT_MEMORY.md`
- UI polls `GET /api/compare/[id]/report/status` while pending (allowed exception, FRONTEND_MASTER.md §10). A Retry control is always available while pending (not only on failed), so a killed `after()` task that never writes `failed` still has an escape hatch.

---

## 9. ERROR HANDLING

| Code                           | Trigger                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `PARSE_FAILED`                 | `pdf-parse` or `mammoth` threw or returned empty content on an uploaded file                                         |
| `EMBEDDING_FAILED`             | Embedding call failed during ingestion or query                                                                      |
| `NO_CHUNKS_RETRIEVED`          | RAG chat retrieval returned nothing above similarity threshold — response should say "I don't know," not hallucinate |
| `CHAT_GENERATION_FAILED`       | LLM call for chat generation failed or returned an empty/error response                                              |
| `COMPARISON_GENERATION_FAILED` | LLM call for comparison analysis failed or returned unparseable structured output                                    |
| `DOCX_GENERATION_FAILED`       | `docx` package threw while building the report file                                                                  |
| `UPLOAD_FAILED`                | Supabase Storage upload failed                                                                                       |

Errors are logged server-side; the UI surfaces a plain-language message, never a raw stack trace. A failed comparison sets `comparisons.status = 'failed'` and the UI must show a clear failed state with a retry option, not a silently stuck "processing" spinner.

---

## 10. ENVIRONMENT VARIABLES

| Variable                                | Type       | Notes                                                                         |
| --------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | Public     | Client + server                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | Public     | Client, RLS-protected                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`             | **Secret** | Server only — used for ingestion, comparison, and report generation routes    |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | **Secret** | Server only — whichever provider is chosen per `PRODUCT_MASTER.md` §11        |
| `EMBEDDING_MODEL_API_KEY`               | **Secret** | Server only, if using a separate embedding provider from the generation model |

---

## 11. WHAT NOT TO BUILD

Do not build:

- Multi-tenant schema (`organization_id` anywhere)
- A generic document management platform — this is two fixed flows over uploaded files
- Support for comparing more than two documents in one run
- A separate parsing pipeline for the comparison feature — it reuses ingestion (§5)
- A queue/job system — request volume for a demo never justifies one
- Realtime sync or multi-user chat sessions
- Full brand-matching DOCX templates — see §8

> If it sounds like infrastructure for scale this project will never see, it doesn't belong here.

---

## 12. FINAL BACKEND PHILOSOPHY

```
Backend serves the demo.
Simple > clever.
One shared foundation, two features, done well > two disconnected pipelines.
The generated Word report is what the client remembers — treat it that way.
```

### Final Reminder

Biggest backend risks for this project:

- Building a second parsing pipeline for comparison instead of reusing ingestion
- Under-investing in DOCX formatting quality because it "isn't the AI part"
- Splitting parsing, RAG, or comparison into separate services when one Next.js app is sufficient
- Passing raw unchunked full-document text into every prompt without checking it still fits context as demo documents grow

---

_Clarion BACKEND MASTER · v1.0 · Portfolio Project_
