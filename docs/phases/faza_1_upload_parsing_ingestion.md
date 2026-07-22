# Clarion

## Faza 1 — Upload, Parsing, Ingestion

Deljena osnova koju koriste i Faza 2 (RAG chat) i Faza 3 (document comparison)

---

## Kontekst

Ovo je najvažnija arhitektonska faza projekta: gradi se **jedan** pipeline za upload, parsing, chunking, i embeddings koji koriste oba feature-a. Comparison feature (Faza 3) ne gradi paralelni parser — vidi `PROJECT_MEMORY.md`, Architecture Lock — Deljena osnova za oba feature-a.

## Upload flow

- Korisnik bira fajl (PDF/DOCX/TXT) i, pri uploadu, bira `purpose`: `corpus` (za RAG chat) ili `comparison` (za poređenje)
- Validacija pre parsiranja: file type (MIME + ekstenzija), veličina fajla (max 10–15MB)
- Fajl se upload-uje u Supabase Storage (bucket koji nije javno čitljiv)
- Insert u `documents` tabelu (`file_type`, `purpose`, `storage_path`)

## Parsing

| Tip fajla | Biblioteka  | Napomena                                       |
| --------- | ----------- | ---------------------------------------------- |
| PDF       | `pdf-parse` | Ekstrakcija sirovog teksta                     |
| DOCX      | `mammoth`   | Ekstrakcija teksta, zadržava osnovnu strukturu |
| TXT       | Native read | Direktno čitanje                               |

Parsing se dešava isključivo server-side (API ruta ili server action) — nikad na klijentu. Vidi `SECURITY.md` §2 i §4.

## Chunking strategija

- Ako dokument ima jasnu strukturu (heading-ovi u markdown-u ili strukturisanom DOCX-u) → deliti po heading-ovima
- Ako nema jasne strukture (npr. skenirani-stil PDF ponude) → fixed-size chunking (~500–800 tokena) sa ~10% preklapanjem
- Svaki chunk čuva `heading` (ili label sekcije/stranice) radi kasnijeg citiranja

## Embeddings

```
za svaki chunk:
    embedding = embed(chunk.content)
    insert into document_chunks
```

- Embedding model mora biti isti za ingestion i query vreme (Faza 2 i Faza 3) — mismatch modela = pokvarena pretraga
- Dokumenti sa `purpose = comparison` se takođe chunk-uju i embed-uju (comparison feature koristi retrieval interno, ne sirov full-text) — vidi `BACKEND_MASTER.md` §5

## Šema (referenca — puna definicija u `BACKEND_MASTER.md` §3)

| Tabela            | Svrha u ovoj fazi                           |
| ----------------- | ------------------------------------------- |
| `documents`       | Jedan red po uploaded fajlu                 |
| `document_chunks` | Chunk-ovan, embed-ovan sadržaj — RAG korpus |

## Status parsiranja (UI)

| Status       | Značenje                                                     |
| ------------ | ------------------------------------------------------------ |
| `processing` | Upload primljen, parsing/chunking/embedding u toku           |
| `ready`      | Dokument je parsiran i spreman za chat/comparison            |
| `failed`     | Parsing ili embedding nije uspeo — vidi error handling ispod |

## Error handling (ova faza)

| Kod                | Trigger                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `UPLOAD_FAILED`    | Supabase Storage upload nije uspeo                                  |
| `PARSE_FAILED`     | `pdf-parse` ili `mammoth` je bacio grešku ili vratio prazan sadržaj |
| `EMBEDDING_FAILED` | Embedding poziv nije uspeo tokom ingestion-a                        |

UI mora prikazati jasan failed status po dokumentu, ne tihu grešku. Vidi `FRONTEND_MASTER.md` §9.

---

## Faza 1 — Checklist

| #   | Zadatak                                                                      | Status |
| --- | ---------------------------------------------------------------------------- | ------ |
| 1   | Upload UI (drag-and-drop ili file picker), sa izborom `purpose`              | [x]    |
| 2   | Validacija file type i veličine na upload ruti                               | [x]    |
| 3   | `documents` insert nakon uspešnog upload-a u Storage                         | [x]    |
| 4   | PDF parsing (`pdf-parse`) implementiran i testiran                           | [x]    |
| 5   | DOCX parsing (`mammoth`) implementiran i testiran                            | [x]    |
| 6   | TXT parsing implementiran                                                    | [x]    |
| 7   | Chunking logika (heading-based + fixed-size fallback)                        | [x]    |
| 8   | Embedding poziv i insert u `document_chunks`                                 | [x]    |
| 9   | Status polje po dokumentu (`processing` / `ready` / `failed`) prikazano u UI | [x]    |
| 10  | Error handling za `UPLOAD_FAILED`, `PARSE_FAILED`, `EMBEDDING_FAILED`        | [x]    |
| 11  | Test: isti pipeline uspešno parsira i `corpus` i `comparison` dokumente      | [x]    |

---

## Status završetka

Faza 1 je kompletirana i zatvorena nakon 6 review rundi. Svi kritični nalazi rešeni i verifikovani izvršavanjem (`tsc`, `test:ingestion`, `verify-docx-table`, neautentifikovan curl na `/api/documents/upload`). Deljeni upload/parse/chunk/embed pipeline, heading-aware DOCX chunking, RLS zaključan na `service_role`, minimalan login + `proxy.ts` — sve u produkcijskom kodu.

---

_Clarion · Faza 1 · Upload, Parsing, Ingestion · Povjerljivo_
