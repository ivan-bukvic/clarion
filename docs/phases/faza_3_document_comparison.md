# Clarion

## Faza 3 — Document Comparison

AI poređenje dva dokumenta, strukturisani nalazi

---

## Kontekst

Drugi core feature. Koristi isti Faza 1 parsing/chunking pipeline — ne gradi paralelni parser. Razlika od RAG chat-a: comparison uzima **ceo** sadržaj oba dokumenta, ne top-k retrieval, jer poređenje zahteva potpun uvid.

## Šema (referenca — puna definicija u `BACKEND_MASTER.md` §3)

| Tabela                | Svrha                                       |
| --------------------- | ------------------------------------------- |
| `comparisons`         | Jedan red po pokrenutom poređenju           |
| `comparison_findings` | Pojedinačni identifikovani nalazi (razlike) |

## Comparison flow

```
1. Insert u comparisons (status = 'processing')
2. Retrieve svi document_chunks za oba dokumenta (ceo sadržaj, ne top-k)
3. Build strukturisan prompt: system instrukcije + pun sadržaj Dokumenta A
   (grupisan po heading-u) + pun sadržaj Dokumenta B
4. LLM poziv, instruisan da vrati strukturisane nalaze:
   { category, description, source_a_ref, source_b_ref }[]
   plus kratak rezime
5. Insert svakog nalaza u comparison_findings
6. Update comparisons.summary i status = 'completed'
7. Trigger DOCX generisanje (Faza 4)
```

## Kategorije nalaza

| Kategorija         | Primer                                                |
| ------------------ | ----------------------------------------------------- |
| `price_difference` | Razlika u ceni iste stavke                            |
| `missing_item`     | Stavka postoji u jednom dokumentu, nedostaje u drugom |
| `scope_difference` | Razlika u obimu posla                                 |
| `term_difference`  | Razlika u uslovima (rokovi, garancija, plaćanje)      |
| `other`            | Ostalo                                                |

## Pravilo za prompt

Prompt mora eksplicitno tražiti cene, nedostajuće stavke, razlike u obimu, i razlike u uslovima kao odvojene kategorije — nestrukturisan "nabroj razlike" prompt daje nekonzistentan izlaz koji je teže prikazati čisto u UI-ju i izveštaju.

## Napomena o skali

Ceo dokument u prompt-u (umesto retrieval-based) je namerno — demo dokumenti su kratki (par stranica) i staju komotno u kontekst. Za mnogo duže realne dokumente bilo bi potrebno chunked/retrieval-based poređenje — beleži se kao razlika za pravog klijenta u README-u, ne gradi se ovde.

## UI zahtevi

- Upload kontrola za tačno dva dokumenta (jasno označeno: Document A / Document B)
- Vidljiv progress/status indikator dok poređenje traje (ne statičan spinner bez povratne informacije)
- Tabela nalaza: kategorija badge, opis, izvorne reference za A i B
- Rezime na vrhu rezultata
- Failed stanje sa retry opcijom ako `comparisons.status = 'failed'`

Puna specifikacija UI-ja: `FRONTEND_MASTER.md` §8.

## Error handling (ova faza)

| Kod                            | Trigger                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `COMPARISON_GENERATION_FAILED` | LLM poziv za comparison analizu nije uspeo ili je vratio neparsiran strukturisani izlaz |

---

## Faza 3 — Checklist

| #   | Zadatak                                                                    | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 1   | `comparisons` i `comparison_findings` tabele                               | [x]    |
| 2   | UI za izbor tačno dva dokumenta (`purpose = comparison`)                   | [x]    |
| 3   | Retrieval celog sadržaja oba dokumenta (ne top-k)                          | [x]    |
| 4   | Strukturisan comparison prompt (kategorije nalaza)                         | [x]    |
| 5   | LLM poziv i parsiranje strukturisanog izlaza                               | [x]    |
| 6   | Insert nalaza u `comparison_findings`                                      | [x]    |
| 7   | `comparisons.summary` i `status = 'completed'` update                      | [x]    |
| 8   | Trigger DOCX generisanja nakon completion-a (stub hook → Faza 4)            | [x]    |
| 9   | Processing UI sa vidljivim progress indikatorom                            | [x]    |
| 10  | Findings tabela u UI (kategorija, opis, source refs)                       | [x]    |
| 11  | Failed stanje + retry opcija                                               | [x]    |
| 12  | Test: poređenje dve realne demo ponude vraća smislene, kategorisane nalaze | [x]    |

---

_Clarion · Faza 3 · Document Comparison · Povjerljivo_
