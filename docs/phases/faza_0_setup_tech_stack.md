# Clarion

## Faza 0 — Setup i Tech Stack

Temeljna infrastruktura projekta

---

## Tech Stack

| Sloj               | Tehnologija                      | Status                 | Obrazloženje                                                                                          |
| ------------------ | -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Frontend + Backend | Next.js (App Router)             | Setup                  | Jedan app radi sve — API Routes, server komponente, Supabase integracija. Isti princip kao Respondly. |
| DB + Vector store  | Supabase (PostgreSQL + pgvector) | Setup                  | DB, Auth, Storage, i vector store u jednom servisu — nema posebne vector baze                         |
| Auth               | Supabase Auth                    | Setup                  | Jedan seedovan korisnik, email/password                                                               |
| Storage            | Supabase Storage                 | Setup                  | Uploaded dokumenti (PDF/DOCX/TXT) i generisani `.docx` izveštaji                                      |
| LLM                | Anthropic Claude API ili OpenAI  | Setup — odabrati jedan | Generacija odgovora, comparison analiza, embeddings — isti provajder za ingestion i query             |
| PDF parsing        | `pdf-parse` (npm)                | Setup                  | Ekstrakcija teksta iz PDF fajlova                                                                     |
| DOCX parsing       | `mammoth` (npm)                  | Setup                  | Ekstrakcija teksta iz uploaded DOCX fajlova                                                           |
| DOCX generisanje   | `docx` (npm)                     | Setup                  | Generisanje strukturisanog Word izveštaja (Faza 4)                                                    |
| Hosting            | Vercel                           | Napomena               | Koristiće se, setup kasnije                                                                           |
| Naziv aplikacije   | Clarion                          | Odlučeno               | —                                                                                                     |

## Zašto jedan Next.js app

Za razliku od Flight Sharing Platform-a, gde je SEO bio ključni razlog za Next.js, ovde je razlog arhitektonski: Clarion je alat iza login-a (nema javnih, indeksiranih stranica), pa SEO nije faktor. Next.js je izabran jer omogućava da frontend, API rute (upload, chat, comparison, DOCX generisanje), i Supabase integracija žive u istom deploy-u — bez potrebe za posebnim backend servisom. Vidi `PROJECT_MEMORY.md`, Architecture Lock — Struktura proizvoda.

## Setup koraci

### 1. Git i projekt struktura

- GitHub repozitorijum kreiran (private)
- Branching strategija: `main`, `develop`, `feature/*`
- `.gitignore` postavljen
- `README.md` s uputama za lokalni setup

### 2. Next.js inicijalizacija

- `npx create-next-app@latest` sa TypeScript-om, Tailwind-om, App Router-om
- Folder struktura i path aliasi (`@/components`, `@/lib` itd.)
- ESLint i Prettier konfiguracija

### 3. Supabase projekt

- Kreirati novi Supabase projekat
- Pohraniti Project URL i API ključeve
- Omogućiti `pgvector` extension
- Supabase Auth konfigurisan (email/password), jedan seedovan korisnik
- Supabase Storage bucket za uploaded dokumente i generisane izveštaje (nije javno čitljiv — vidi `SECURITY.md` §4)
- Supabase MCP server spojen u Cursor

### 4. LLM provajder

- Odabrati Claude API ili OpenAI (vidi `PRODUCT_MASTER.md` §11)
- Pohraniti API ključ
- Odabrati embedding model i zapisati dimenziju (`vector(N)` u šemi) — mora ostati konzistentan između ingestion i query faze

### 5. Document parsing biblioteke

- Instalirati `pdf-parse`, `mammoth`, `docx`
- Test parsiranja na jednom demo PDF i jednom demo DOCX fajlu

### 6. Cursor setup

- Supabase MCP server spojen
- Kreirati `.cursorrules` fajl sa projektnim konvencijama (vidi tabelu ispod)

### 7. Napomena — Setup kasnije

- Vercel — deployment konfiguracija (Faza 6)
- Basic-auth (`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`) — kad se demo URL javno objavi (Faza 6)

## Shared Foundations (uspostaviti u ovoj fazi)

Ovi moduli se koriste u svim narednim fazama bez ponovne inicijalizacije:

| Modul            | Sadržaj                                                   |
| ---------------- | --------------------------------------------------------- |
| `lib/supabase/`  | Server i client Supabase klijent                          |
| `lib/llm/`       | LLM klijent (Claude ili OpenAI), embedding helper         |
| `lib/documents/` | Parsing helperi (`pdf-parse`, `mammoth`), chunking logika |
| `lib/auth/`      | Auth guard za middleware/API rute                         |

> Pre pisanja nove implementacije u bilo kojoj fazi, prvo proveriti da li već postoji deljeni modul za tu potrebu.

## Environment varijable (referenca)

Cursor će generisati `.env.local`. Ovo je referentni popis varijabli koje će biti potrebne.

| Varijabla                              | Opis                                        | Status                   |
| -------------------------------------- | ------------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase projekat URL                       | Setup                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Supabase javni ključ                        | Setup                    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase server ključ (samo server-side)    | Setup                    |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | LLM provajder (odabrati jedan)              | Setup                    |
| `EMBEDDING_MODEL_API_KEY`              | Ako je embedding provajder odvojen od LLM-a | Setup ako je primenljivo |
| `BASIC_AUTH_USER`                      | Basic-auth zavesa za javni demo URL         | Kasnije                  |
| `BASIC_AUTH_PASSWORD`                  | Basic-auth zavesa za javni demo URL         | Kasnije                  |

## Folder struktura

```
/app                      → Next.js App Router stranice i layouti
/app/login
/app/chat
/app/compare
/app/api
/app/api/documents/upload
/app/api/chat
/app/api/compare
/app/api/compare/[id]/report
/components/chat
/components/compare
/components/ui            → shadcn primitivi
/lib/supabase
/lib/llm
/lib/documents
/lib/rag
/lib/compare
/types
.cursorrules
.env.local
.gitignore
```

## .gitignore

| Kategorija    | Šta se ignoriše             | Zašto                          |
| ------------- | --------------------------- | ------------------------------ |
| Environment   | `.env.local`, `.env*.local` | API ključevi i tajni podaci    |
| Dependencies  | `/node_modules`             | Regeneriše se sa `npm install` |
| Next.js build | `/.next`, `/out`            | Build artefakti                |
| OS fajlovi    | `.DS_Store`, `Thumbs.db`    | Sistemski fajlovi              |
| IDE           | `.cursor`, `.vscode`        | Lokalne IDE postavke           |
| Logs          | `*.log`, `npm-debug.log*`   | Log fajlovi                    |
| TypeScript    | `*.tsbuildinfo`             | Build cache                    |
| Vercel        | `.vercel`                   | Lokalne Vercel postavke        |

## Cursor Rules (`.cursorrules`)

Definiše kako AI generiše kod za ovaj projekat. Mora biti postavljeno pre prvog promptovanja.

| Pravilo        | Detalji                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| Tech stack     | Next.js App Router, TypeScript strict, Tailwind, Supabase                            |
| Komponente     | Server komponente po default-u, `"use client"` samo kad treba                        |
| Supabase       | Uvek koristiti server klijent za osetljive operacije (upload, ingestion, comparison) |
| RLS            | Sve DB operacije moraju poštovati RLS politike — vidi `SECURITY.md` §3               |
| TypeScript     | Koristiti generisane tipove iz Supabase-a (`/types/supabase.ts`)                     |
| Naming         | `snake_case` u bazi i API payload-ima — vidi `PROJECT_MEMORY.md`                     |
| Error handling | Svaka async operacija mora imati try/catch, error kodovi po `BACKEND_MASTER.md` §9   |
| Env varijable  | `NEXT_PUBLIC_` prefiks samo za klijentske varijable                                  |
| Arhitektura    | Jedan Next.js app — nikad predlagati Python/FastAPI servis ili mikroservise          |

---

## Faza 0 — Checklist

| #   | Zadatak                                                                                        | Status |
| --- | ---------------------------------------------------------------------------------------------- | ------ |
| 1   | GitHub repozitorijum kreiran (private)                                                         | [ ]    |
| 2   | Next.js projekat inicijalizovan (TypeScript, Tailwind, App Router)                             | [ ]    |
| 3   | Folder struktura postavljena                                                                   | [ ]    |
| 4   | ESLint i Prettier konfigurisani                                                                | [ ]    |
| 5   | `.gitignore` postavljen                                                                        | [ ]    |
| 6   | Supabase projekat kreiran, `pgvector` extension omogućen                                       | [ ]    |
| 7   | Supabase Auth konfigurisan, jedan korisnik seedovan                                            | [ ]    |
| 8   | Supabase Storage bucket kreiran (nije javno čitljiv)                                           | [ ]    |
| 9   | Supabase MCP spojen u Cursor                                                                   | [ ]    |
| 10  | LLM provajder odabran (Claude ili OpenAI), API ključ pohranjen                                 | [ ]    |
| 11  | Embedding model odabran, dimenzija zapisana                                                    | [ ]    |
| 12  | `pdf-parse`, `mammoth`, `docx` instalirani i testirani                                         | [ ]    |
| 13  | `.cursorrules` fajl kreiran                                                                    | [ ]    |
| 14  | Shared Foundations moduli (`lib/supabase`, `lib/llm`, `lib/documents`, `lib/auth`) postavljeni | [ ]    |
| 15  | `.env.local` kreiran sa potrebnim varijablama                                                  | [ ]    |
| 16  | (Kasnije) Vercel deployment konfigurisan                                                       | [ ]    |
| 17  | (Kasnije) Basic-auth konfigurisan                                                              | [ ]    |

---

_Clarion · Faza 0 · Setup i Tech Stack · Povjerljivo_
