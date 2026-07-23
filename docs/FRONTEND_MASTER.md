# CLARION

## FRONTEND MASTER — v1.0

> **THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR:**
>
> - Route structure
> - Page layout and UX rules
> - Component requirements per screen
> - Frontend stack and forbidden patterns
> - Frontend/backend contract
> - Cursor → Claude Code UI polish workflow

---

## 1. PRODUCT CONTEXT

Clarion's frontend covers two connected flows: a document chat interface (upload + RAG chat with citations) and a document comparison flow (upload two files + view/download a generated report). Single-user, no multi-tenant UI.

### Core UX Goal

Make both flows fast and legible: a user should be able to upload a document and start chatting within seconds, see exactly which source a citation came from, and — separately — upload two documents and land on a clear findings view with a one-click report download.

### What this is NOT

- Not a multi-page enterprise document management console
- Not a general file browser/library UI
- Not a configurable, multi-tenant dashboard

### Build workflow (important — see §12)

The initial frontend is built plainly in Next.js/shadcn during the Cursor backend build. It does **not** need to be visually polished at that stage — it needs to work, so the backend can be verified end-to-end. Visual polish happens later in a dedicated Claude Code pass, working directly in the same repo. Do not over-invest in UI polish during the Cursor phase.

---

## 2. FRONTEND PHILOSOPHY

```
Functionality first, then a clean and simple UI (via a dedicated Claude Code polish pass).
Two focused flows > one sprawling app.
Legible > exhaustive.
Real placeholder documents > lorem ipsum.
```

Since the deployed URL is part of the demo, the UI needs to look intentional and branded by the time it's shown — not like a scaffold — but does not need a polished design system beyond shadcn/Tailwind defaults plus the Claude Code polish pass.

---

## 3. OFFICIAL FRONTEND STACK

| Layer         | Technology                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| Framework     | Next.js 15 (App Router)                                                        |
| Language      | TypeScript                                                                     |
| Styling       | Tailwind CSS                                                                   |
| Components    | shadcn/ui (base), refined via a dedicated Claude Code polish pass post-backend |
| Data fetching | Server components + Supabase server client; client-side `fetch` for actions    |
| Forms         | React Hook Form + Zod (file upload validation, comparison selection)           |

### FORBIDDEN

Do not introduce, given the scope:

- Redux, Zustand, or any global state library — component state and server data are enough
- TanStack Query — no client-side caching complexity needed for this data volume
- Complex routing / nested layouts
- Custom design system or component library beyond shadcn
- Realtime subscriptions or WebSocket-based UI updates

---

## 4. PROJECT STRUCTURE (indicative)

```
src/
  app/
    login/
      page.tsx
    dashboard/                → Amandman v1.1 — recent activity overview + nav
      page.tsx
    chat/
      page.tsx              → document upload (corpus) + chat interface
      loading.tsx
    compare/
      page.tsx              → document upload (comparison) + findings + report download
      loading.tsx
    api/
      documents/upload/route.ts
      chat/route.ts
      compare/route.ts
      compare/[id]/report/route.ts
  components/
    layout/
      app-sidebar.tsx        → Amandman v1.1 — Clarion brand + Ridgeline workspace name + nav
    chat/
      upload-panel.tsx
      chat-thread.tsx
      citation-badge.tsx
    compare/
      compare-upload.tsx
      findings-table.tsx
      report-download-button.tsx
    ui/                       → shadcn primitives
  lib/
    supabase/
    llm/
    documents/
    rag/
    compare/
```

---

## 5. ROUTE STRUCTURE

### Public routes

| Route    | Auth required |
| -------- | ------------- |
| `/login` | No            |

### Protected routes

| Route        | Auth required     |
| ------------ | ------------------ |
| `/dashboard` | Yes (single user) |
| `/chat`      | Yes (single user) |
| `/compare`   | Yes (single user) |

### API routes (not pages)

| Route                      | Public/Protected | Notes                                      |
| -------------------------- | ---------------- | ------------------------------------------ |
| `/api/documents/upload`    | Protected        | Handles both corpus and comparison uploads |
| `/api/chat`                | Protected        | RAG chat turn                              |
| `/api/compare`             | Protected        | Starts a comparison run                    |
| `/api/compare/[id]/report` | Protected        | Downloads the generated `.docx`            |

### Route protection rule

Next.js middleware redirects any unauthenticated request to `/chat` or `/compare` back to `/login`. Given there is only one role, there is no role-based routing logic to build.

---

## 6. LOGIN PAGE

### Purpose

Gate the app. Given single-user scope, this can be Supabase Auth email/password for one seeded user, or basic-auth at the edge for the public demo URL, layered in addition (see `BACKEND_MASTER.md` §4).

### Must contain

- Email + password fields
- Clarion branding (logo, name) — reinforces "real product" feel for the demo
- Error state for invalid credentials

---

## 7. CHAT PAGE (`/chat`)

### Layout

Two-panel: document list/upload on one side (collapsible on mobile), chat thread on the other.

### Must show

- Upload control (drag-and-drop or file picker) — accepts PDF/DOCX/TXT
- List of uploaded documents with parsing status (processing / ready / failed)
- Chat thread: user messages and assistant responses
- **Every assistant response with a citation must show which document/section it came from** — a badge or inline reference the user can click to see the source chunk
- If retrieval found nothing relevant, the assistant message must visibly say so, not just answer vaguely
- Empty state: "Upload a document to get started" before any files exist

---

## 8. COMPARE PAGE (`/compare`)

### Layout

Single column: upload step, then results step once a comparison completes.

### Must show

- Upload control for exactly two documents (clear labeling: Document A / Document B)
- Processing state while comparison runs (this can take a noticeable number of seconds — show a real progress/status indicator, not a static spinner with no feedback)
- **Findings table**: category badge, description, source references for A and B
- Summary text at the top of the results
- **Download Report** button — downloads the generated `.docx`
- Failed state: clear error message + retry option if `comparisons.status = 'failed'` (see `BACKEND_MASTER.md` §9)

---

## 9. EMPTY & LOADING STATES

### OBAVEZNO (mandatory)

- `/chat` and `/compare` each get a `loading.tsx` skeleton
- Empty document list and empty chat thread each get a real empty-state message, never a blank div
- Comparison processing state must show visible progress, not a silent wait
- Failed parsing, comparison, or DOCX generation surfaces a visible error, not a silent failure

---

## 10. REALTIME

**Not part of MVP**, consistent with the project's simplicity-first approach.

Allowed:

- Poll or refresh for comparison status (e.g. simple interval polling while `status = 'processing'`, or a manual refresh button) — this is the one allowed exception to "no polling" in `PROJECT_MEMORY.md`, since a comparison run takes real processing time and the user needs to know when it's done

Not allowed:

- Supabase Realtime subscriptions
- WebSocket architecture
- Polling for the chat interface (chat responses are synchronous request/response, not something that needs live updates)

---

## 11. DESIGN SYSTEM

### Visual direction

- Clean, modern, minimal — shadcn defaults with Clarion branding (name, small logo/favicon, a simple accent color) layered on top
- No custom illustration or animation work — Framer Motion is not needed at this scope

### Branding source

**Updated per PROJECT_MEMORY.md Amandman v1.1.** Clarion's own name/logo/accent color remains the app's brand (not replaced by a client's — Clarion itself is the product being demoed, unlike Respondly which was branded as its fictional clinic client). Ridgeline Renovations now appears two ways: (1) within the demo documents themselves (quotes, project docs), as originally planned, and (2) as the active **workspace/client name** shown in the app chrome (e.g. sidebar/header, next to or below the Clarion logo) — similar to how a real SaaS tool shows the logged-in company name while keeping its own product branding. This is a deliberate change from v1.0: since the portfolio deliverable is now screenshots only (no Loom narration providing context), the app needs to look more convincingly like it's in real use by a client, without ever removing or hiding that Clarion is the product being demoed.

---

## 12. RESPONSIVE RULES

- Desktop-first is acceptable for the build phase, but the page must not break on a phone-sized viewport — portfolio screenshots (Amandman v1.1) may include a mobile view
- Two-panel chat layout collapses to a single stacked column below `md` breakpoint
- Findings table on `/compare` scrolls horizontally on narrow viewports rather than breaking layout

---

## 13. FRONTEND / BACKEND CONTRACT

### Naming convention

`snake_case` everywhere, matching `BACKEND_MASTER.md`:

```
document_id, comparison_id, cited_chunk_ids,
source_a_ref, source_b_ref, created_at
```

### Page data requirements

- Chat page: `documents` (purpose = corpus) + `chat_messages` for the active session
- Compare page: selected `documents` (purpose = comparison) → `comparisons` + `comparison_findings` + `generated_reports`

Full payload/query detail: see `BACKEND_MASTER.md` §5–§8.

---

## 14. CURSOR → CLAUDE CODE UI POLISH WORKFLOW

1. Build backend + minimal functional UI in Cursor, following this document's route/component structure
2. Verify both flows work end-to-end against real demo documents
3. Open a **dedicated Claude Code session** on the same repo — no export/import step, no second tool
4. In that session, work **only** on UI/component files (`components/`, page-level layout/styling in `app/**/page.tsx` presentation, not logic) — see `PROJECT_MEMORY.md` for the hard rule; this is self-imposed discipline since Claude Code has full repo access, not a sandboxed constraint
5. Review the git diff after the polish session before committing — reject any change touching `app/api/`, `lib/`, or schema/migration files
6. Deploy the polished result to Vercel

---

## 15. WHAT NOT TO BUILD

Do not build, regardless of how small the addition seems:

- User/role management UI (there is only one user)
- Settings page
- A general file browser/library beyond the two upload flows
- Analytics or reporting views
- Notification bell / in-app notification system
- Support for uploading/comparing more than two documents at once
- Anything resembling multi-tenant org switching

> If a feature idea sounds like it belongs in a "real SaaS product," it does not belong in Clarion. This is a demo of two specific patterns, not a product.

**Exception (PROJECT_MEMORY.md Amandman v1.1):** a minimal **Dashboard** landing page (`/dashboard`) plus a persistent sidebar for navigation are deliberately in scope — added because the portfolio deliverable is now screenshots only, and a bare two-route app doesn't read as a real product in a static screenshot the way it would with Loom narration. The dashboard shows recent documents and recent comparisons (read-only, from existing tables) plus quick links to `/chat` and `/compare` — nothing else. It is explicitly NOT the "Analytics or reporting views" item above: no charts, no metrics, no usage stats. Keep it to a single simple page; do not let it grow into anything from the rest of this list.

---

## 16. FINAL FRONTEND PHILOSOPHY

Frontend must be:

- fast to build in its initial Cursor form (functional, not polished)
- legible enough that a Loom viewer immediately understands both flows from the UI alone
- polished exactly once, deliberately, in the Claude Code pass — not polished piecemeal during backend development

### Final Reminder

Biggest frontend risks for this project:

- Polishing UI during the Cursor/backend phase instead of deferring it to the dedicated Claude Code pass
- Letting a UI polish session drift into backend routes or logic, since there's no sandbox wall stopping it
- A findings table or chat citation UI that's technically correct but not legible enough for a static screenshot to read clearly on its own

---

## 17. DASHBOARD & SIDEBAR NAVIGATION (Amandman v1.1)

> Added after Faza 2, before Faza 3 — see `PROJECT_MEMORY.md` Amandman v1.1 for the full rationale (screenshots-only portfolio, no Loom narration). This section is additive; it does not change anything in §1–§16.

### Scope

A persistent sidebar (visible on `/dashboard`, `/chat`, `/compare`) plus one new page, `/dashboard`. This is the only scope addition from the original two-route plan — everything in §15 "What Not To Build" still applies beyond it.

### Sidebar — must contain

- Clarion name/logo (brand identity — never removed or replaced)
- "Ridgeline Renovations" shown as the active workspace/client name (static text is sufficient — no real workspace-switching logic, no multi-tenant model, see `PROJECT_MEMORY.md`)
- Navigation links: Dashboard, Chat, Compare
- Collapses sensibly on mobile, consistent with the responsive rules in §12

### Dashboard page (`/dashboard`) — must show

The point of this page isn't just "looks like a real app" — it should visibly demonstrate that AI is doing real work for Ridgeline, not just storing files:

- Welcome header: "Welcome back, Ridgeline Renovations" + a short tagline naming the AI value prop, e.g. "AI-powered document intelligence — chat with your project files or compare vendor quotes in seconds."
- Quick stats row: document count, comparison count, chat conversation count — but the comparisons stat pairs a *findings* count alongside it (e.g. "3 comparisons · 11 differences found"), aggregated from the existing `comparison_findings` table. This is a real number from real AI output, not decoration — it's the cheapest way to make the AI's actual value visible at a glance.
- Recent documents (a short list, read from the existing `documents` table — title, purpose, status)
- Recent comparisons (a short list, read from the existing `comparisons` table — documents compared, status, date, and a per-row findings count from `comparison_findings`, same reasoning as the stats row)
- Quick links into `/chat` and `/compare`
- Empty state if there's no data yet, consistent with §9's empty-state rules

All numbers shown must come from real aggregation queries against existing tables — no invented/hardcoded stats (see `PROJECT_MEMORY.md` Demo Integrity Rule).

### Explicitly not part of this addition

No charts, metrics, or usage stats (that's the "Analytics or reporting views" item in §15, still prohibited). No settings, no real workspace switching, no additional pages beyond `/dashboard` itself. If a dashboard idea starts to look like a real product feature rather than a static overview, it doesn't belong here — same test as §15.

---

_Clarion FRONTEND MASTER · v1.0 · Portfolio Project_
