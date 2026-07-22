# Clarion

## Faza 2 — RAG Chat

Chat sa citatima izvora nad učitanim dokumentima

---

## Kontekst

Prvi od dva core feature-a koje projekat dokazuje. Koristi Faza 1 pipeline (upload, parsing, chunking, embeddings) bez izmena — ova faza dodaje samo query-time logiku i chat UI.

## Šema (referenca — puna definicija u `BACKEND_MASTER.md` §3)

| Tabela          | Svrha                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| `chat_sessions` | Jedna po chat konverzaciji                                                     |
| `chat_messages` | Chat poruke (`user` / `assistant`), sa `cited_chunk_ids` na assistant porukama |

## Query-time flow

```
1. embed(user_message)
2. similarity search nad document_chunks WHERE document.purpose = 'corpus'
   (top-k, k=3–5, cosine distance)
3. build prompt: system instrukcije + retrieved chunks + chat istorija + user poruka
4. poziv LLM API-ja → assistant odgovor
5. insert u chat_messages (role = 'assistant', cited_chunk_ids = retrieved chunk id-jevi)
```

## Pravilo za prompt

Sistemski prompt mora instruisati model da odgovara **isključivo** iz retrieved chunk-ova, i da kaže da ne zna umesto da nagađa ako chunk-ovi ne pokrivaju pitanje. Ovo je ono što čini "citation-backed" istinitom tvrdnjom u demo-u, ne samo UI oznaku. Svaka assistant poruka mora imati bar prazan `cited_chunk_ids` niz.

## UI zahtevi

- Dvopanelni layout: lista/upload dokumenata na jednoj strani, chat thread na drugoj
- Svaki assistant odgovor sa citatom mora vizuelno pokazati iz kog dokumenta/sekcije dolazi (badge ili klikabilna referenca)
- Ako retrieval nije pronašao ništa relevantno, poruka mora to jasno reći, ne samo nejasno odgovoriti
- Prazno stanje: "Upload a document to get started" pre nego što postoji ijedan fajl

Puna specifikacija UI-ja: `FRONTEND_MASTER.md` §7.

## Error handling (ova faza)

| Kod                   | Trigger                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `NO_CHUNKS_RETRIEVED` | Retrieval nije vratio ništa iznad similarity threshold-a — odgovor mora reći "ne znam", ne halucinirati |

---

## Faza 2 — Checklist

| #   | Zadatak                                                                 | Status |
| --- | ----------------------------------------------------------------------- | ------ |
| 1   | `chat_sessions` i `chat_messages` tabele                                | [ ]    |
| 2   | Query embedding + similarity search (top-k, k=3–5)                      | [ ]    |
| 3   | Prompt construction sa system instrukcijama (odgovor samo iz chunk-ova) | [ ]    |
| 4   | LLM poziv i insert assistant poruke sa `cited_chunk_ids`                | [ ]    |
| 5   | Chat UI — dvopanelni layout (dokumenti / thread)                        | [ ]    |
| 6   | Citation badge/referenca na svakoj assistant poruci                     | [ ]    |
| 7   | "Ne znam" fallback kad nema retrieved chunk-ova                         | [ ]    |
| 8   | Prazno stanje za chat pre upload-a                                      | [ ]    |
| 9   | `loading.tsx` skeleton za `/chat`                                       | [ ]    |
| 10  | Test: pitanje van korpusa vraća "ne znam", ne izmišljen odgovor         | [ ]    |

---

_Clarion · Faza 2 · RAG Chat · Povjerljivo_
