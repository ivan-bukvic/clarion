# Clarion — Faza 5 Brief (Claude Code UI Polish)

Prompt/spec za **posebnu Claude Code sesiju** koja doteruje UI u istom repou. Backend (Faze 0–4) i funkcionalni Dashboard/Sidebar (Amandman v1.1) su već gotovi — ova sesija radi **samo vizuelni polish**.

Izvor istine: `FRONTEND_MASTER.md` §7–§12, §14, §17 · `PROJECT_MEMORY.md` (UI polish lock) · `faza_5_claude_code_frontend_polish.md`.

---

## Hard rules (non-negotiable)

### Dozvoljeno dirati

- `components/**` (uključujući `components/layout/app-sidebar.tsx`, chat/*, compare/*, ui/*)
- Presentation / layout / className delovi u `app/**/page.tsx` i `app/**/loading.tsx` (npr. `app/(app)/**`, `app/login/page.tsx`)
- `app/(app)/layout.tsx` (shell oko sidebara)
- `app/globals.css` (theme tokeni, accent boja)
- `app/layout.tsx` (metadata / branding title/description)
- `public/` (favicon, mali logo asset ako se doda)

### Zabranjeno dirati

- `app/api/**`
- `lib/**` (uključujući auth, supabase, documents, rag, compare, llm)
- `proxy.ts`
- Migracije / šema / `types/supabase.ts`
- Bilo koja fetch/query/agregaciona logika, API contract, ili `snake_case` payload imena
- Nove stranice, settings, analytics, Framer Motion, Redux/Zustand/TanStack Query

Ako se nađeš da menjaš `app/api/*` ili `lib/*` — **stani**, čak i ako "izgleda bezazleno". To nije deo ovog prolaska.

User-facing tekst ostaje na **engleskom**.

---

## Design pravac (`FRONTEND_MASTER.md` §11)

- Clean, modern, minimal — shadcn defaults + Clarion branding
- Clarion = product brand (ime, mali logo/favicon, jedna accent boja)
- "Ridgeline Renovations" = aktivni workspace/client name u chrome-u (sidebar) — ne zamenjuje Clarion
- Bez custom ilustracija, bez animacija (Framer Motion nije u scope-u)
- Ne pretvarati Dashboard u analytics view (nema grafikona, metrika, usage stats)

---

## Per-page checklist

### Login (`/login`)

- [ ] Clarion branding jasan (ime + logo/favicon ako postoji)
- [ ] Čist error state za invalid credentials (plain language, engleski)
- [ ] Forma čitljiva, fokus states konzistentni sa ostatkom app-a

### Sidebar (`components/layout/app-sidebar.tsx` + `app/(app)/layout.tsx`)

- [ ] Clarion name/logo vidljiv i dominantan kao product brand
- [ ] "Ridgeline Renovations" prikazan kao workspace/client name (static text)
- [ ] Nav: Dashboard, Chat, Compare — aktivan link jasan
- [ ] Mobile collapse ostaje funkcionalan i vizuelno uredan (ne samo "radi")

### Dashboard (`/dashboard`)

- [ ] Welcome header + AI value-prop tagline čitljivi za screenshot
- [ ] Quick stats row uredan (documents / comparisons·differences / chat conversations)
- [ ] Recent documents + recent comparisons liste čitljive; empty state nije blank div
- [ ] Quick links ka `/chat` i `/compare` očigledni
- [ ] Ne dodavati chartove, settings, ili nove sekcije van postojećeg sadržaja

### Chat (`/chat`)

- [ ] Dvopanelni layout: document list/upload levo, chat thread desno
- [ ] Citation badge stil jasan i klikabilan/čitljiv
- [ ] Empty state: "Upload a document to get started" (ili ekvivalent) pre fajlova
- [ ] Loading skeleton (`loading.tsx`) usklađen sa doteranim layoutom
- [ ] **Nezavisno skrolovanje panela (nalaz iz ručnog testiranja):**
  - Lista dokumenata skroluje **odvojeno** od chat thread-a
  - Poruke skroluju unutar chat panela
  - Input polje ostaje **uvek vidljivo / fiksirano na dnu** chat panela
  - Korisnik **ne** mora da skroluje celu stranicu kroz dugu listu dokumenata da bi stigao do inputa
- [ ] Na mobilnom: paneli se slažu u jednu kolonu ispod `md` (vidi Responsive)

### Compare (`/compare`)

- [ ] Upload koraci jasni: Document A / Document B
- [ ] Processing indikator daje feedback dok poređenje traje (ne tihi spinner)
- [ ] Findings tabela: category badge, description, source A/B refs — čitljivo u screenshotu
- [ ] Summary tekst iznad rezultata
- [ ] Download Report dugme uočljivo
- [ ] Failed state: poruka + retry opcija
- [ ] Na uskom viewportu: findings tabela horizontalno scroll-uje, layout se ne lomi

---

## Responsive checklist (`FRONTEND_MASTER.md` §12)

- [ ] Desktop-first OK, ali phone-sized viewport ne sme da lomi layout
- [ ] Sidebar collapse na mobilnom ostaje uporabljiv
- [ ] Dvopanelni chat layout kolabira u stacked column ispod `md`
- [ ] Chat: nezavisno skrolovanje / fiksirani input i dalje važi na mobilnom (nema "izgubljenog" inputa ispod fold-a zbog duge liste dokumenata)
- [ ] Findings tabela na `/compare` scroll-uje horizontalno na uskom ekranu

---

## Post-session korak (obavezno pre commit-a)

1. `git status` + `git diff` — pregledati **svaku** izmenu
2. **Odbaciti** bilo šta što dira:
   - `app/api/`
   - `lib/`
   - `proxy.ts`
   - migracije / šemu / `types/supabase.ts`
3. Ručno proveriti regresiju: login → dashboard → chat (upload + poruka + citation) → compare (findings + download) na desktop i mobilnom viewportu
4. Tek onda commit (van ove Claude Code sesije, po dogovoru)

---

## Šta uspeh izgleda

Screenshot portfolio može da stoji bez Loom naracije: app izgleda kao namerni Clarion proizvod u upotrebi kod Ridgeline Renovations, sa čitljivim chat citatima, findings tabelom, i dashboardom koji pokazuje stvarni AI rad — ne scaffold.

---

_Clarion · Faza 5 Brief · Claude Code UI Polish handoff_
