# Clarion

## Faza 6 — Demo Polish i Deploy

Verodostojnost demo-a, deploy na javni URL

---

## Kontekst

Ova faza ne dodaje novu funkcionalnost — čini demo verodostojnim i spremnim za pokazivanje u proposal-ima. Vidi Demo Integrity Rule u `PROJECT_MEMORY.md`.

## Demo dokumenti (Ridgeline Renovations)

| Fajl                             | Svrha                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `quote-a-ridgeline.txt`          | Ponuda izvođača A za kuhinjski remont — comparison demo |
| `quote-b-summit.txt`             | Ponuda izvođača B za isti posao — comparison demo       |
| `scope-of-work.txt`              | RAG chat korpus                                         |
| `material-spec-sheet.txt`        | RAG chat korpus                                         |
| `permit-application.txt`         | RAG chat korpus                                         |
| `prior-vendor-quote.txt`         | RAG chat korpus                                         |

Svi dokumenti moraju biti realno napisani (stvarni brojevi, stavke, uslovi) — ne lorem ipsum, ne "test test test". Vidi `PRODUCT_MASTER.md` §9.

## Deploy

- Deploy na Vercel, pravi javni URL
- `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` konfigurisani u Vercel Environment Variables ako demo URL treba dodatnu zavesu preko login-a
  > **Napomena (avgust 2026):** Basic-Auth zavesa je naknadno uklonjena iz `proxy.ts` — više se ne konfiguriše. Ručno ukloniti `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` iz Vercel Environment Variables ako su još postavljeni. Supabase Auth ostaje jedina zaštita. Vidi `SECURITY.md` §1.
- Svi env varijable iz Faze 0 potvrđene u produkciji (ne samo lokalno)

## Branding

- Clarion ime, mali logo/favicon, jedna accent boja
- Ridgeline Renovations branding pojavljuje se samo unutar demo dokumenata (ponude, projektna dokumentacija), ne u app chrome-u — vidi `FRONTEND_MASTER.md` §11

## README

Kratak README u repou, pokriva:

- Kako pokrenuti projekat lokalno
- Arhitektura (jedan Next.js app, deljena RAG osnova, Supabase pgvector)
- Cursor → Claude Code UI polish workflow korišćen za frontend
- Šta bi se promenilo za pravog klijenta (npr. brend-matching template, chunked comparison za duže dokumente, multi-document support)

## Transparentnost u proposal-ima

- Ovo je demo/portfolio build, ne pravi klijentski rad — jasno naznačeno
- Arhitektura predstavljena kao identična onome što bi klijent dobio, prilagođena njihovim dokumentima i template-u
- **Nikad**: lažan broj korisnika, izmišljeni testimonijali, implikacija da postoji pravi klijent

## Security checklist (pre javnog deploy-a)

Pre nego što se demo URL objavi javno, proći kompletan checklist iz `SECURITY.md` §6 — svih 11 stavki, uključujući proveru da nema secret-a u git repozitorijumu i da je Storage bucket zaštićen.

---

## Faza 6 — Checklist

| #   | Zadatak                                                                            | Status |
| --- | ---------------------------------------------------------------------------------- | ------ |
| 1   | Svi demo dokumenti (2 ponude + 4 projektna dokumenta) finalizovani, realni sadržaj | [x]    |
| 2   | Deploy na Vercel, javni URL radi                                                   | [ ]    |
| 3   | Env varijable potvrđene u produkciji                                               | [ ]    |
| 4   | Basic-auth konfigurisan (ako je demo URL javan bez login-a)                        | [x]    |
| 5   | Clarion branding (ime, logo/favicon, accent boja) primenjen                        | [x]    |
| 6   | README napisan (setup, arhitektura, workflow, razlike za pravog klijenta)          | [x]    |
| 7   | `SECURITY.md` §6 checklist kompletno prođen                                        | [x]    |
| 8   | End-to-end test na produkcijskom URL-u: upload → chat sa citatom                   | [ ]    |
| 9   | End-to-end test na produkcijskom URL-u: upload dva dokumenta → download izveštaja  | [ ]    |

---

_Clarion · Faza 6 · Demo Polish i Deploy · Povjerljivo_
