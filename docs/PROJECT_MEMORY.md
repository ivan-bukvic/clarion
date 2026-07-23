# Clarion

## PROJECT MEMORY — v1.0

> **OVAJ DOKUMENT JE JEDINI IZVOR ISTINE ZA:**
>
> - Kritične podsetnike
> - Arhitektonske odluke koje su zaključane
> - Anti-patterns i zabranjene putanje

---

## ⚠️ Kritični podsetnik

**Ovo je portfolio demo projekat, ne pravi proizvod.** Cilj nije da klijenti stvarno koriste Clarion — cilj je da dokaže da autor zna da napravi RAG chat + document comparison + strukturisano DOCX generisanje obrazac. Svaka odluka se donosi kroz tu prizmu: da li ovo čini demo ubedljivijim i brzim za izgradnju, ili dodaje kompleksnost koju niko neće videti.

**Generisani Word izveštaj je najvidljiviji artefakt demo-a.** Poređenje dokumenata bez čistog, čitljivog DOCX izlaza ne dokazuje ništa — to je deo koji klijent najduže gleda i pamti. Ne žuriti kroz taj deo da bi se "stiglo do sledeće faze".

---

## Amandman v1.1 — Screenshotovi umesto Loom-a, realističniji app chrome

Odluka doneta nakon Faze 2, pre Faze 3: portfolio deliverable više neće uključivati Loom video snimke — samo screenshotovi aplikacije. Pošto screenshotovi nemaju naraciju koja objašnjava kontekst, app treba da izgleda uverljivije kao da je rađen za pravog klijenta:

- Clarion ostaje brend alata (ime/logo u chrome-u) — Ridgeline Renovations se sada dodatno prikazuje i kao aktivan **workspace/klijent** u app chrome-u (npr. header/sidebar), ne samo unutar sadržaja dokumenata kao ranije. Vidi `FRONTEND_MASTER.md` §11.
- Dodaje se minimalna **Dashboard** stranica (pregled nedavnih dokumenata/poređenja, brzi linkovi ka `/chat` i `/compare`) i trajni sidebar za navigaciju. Ovo je jedini dodatak van originalnog dvoru-rutnog obima — namerno ograničen, ne otvara vrata za dodatne SaaS-stil stranice. Vidi `FRONTEND_MASTER.md` §15 i §17.
- Poenta Dashboard-a nije samo "izgleda kao prava app" — treba vidljivo da pokaže da AI stvarno radi posao za Ridgeline (npr. broj pronađenih razlika iz `comparison_findings`, ne samo broj fajlova), ne da je Clarion puko skladište dokumenata. Svi brojevi moraju biti stvarna agregacija iz baze, nikad izmišljeni.
- Sve ostalo iz "Lock — Šta se NE gradi" ispod ostaje na snazi bez izuzetka (settings, role sistem, notifikacije, analytics dashboard, itd.).
- Demo Integrity Rule i dalje važi — bez Loom naracije, transparentnost da je ovo portfolio/demo rad sada mora biti eksplicitno navedena u README-u i portfolio case-study tekstu, ne samo podrazumevana kroz video kontekst.

> Ovo je svesna, dokumentovana promena, ne tiho odstupanje.

---

## Architecture Lock — Struktura proizvoda

Clarion je **jedan Next.js app** koji radi sve:

- frontend (upload, chat, comparison UI)
- backend (API routes: upload, parsing, RAG, comparison, DOCX generisanje)
- RAG orkestracija

Nema posebnog backend servisa, nema FastAPI parsera, nema mikroservisa. Sve živi u istom deploy-u na Vercel-u. Isti princip kao u Respondly — namerno, radi konzistentnosti kroz portfolio, i zato što UI polish prolazi (§ ispod) radi direktno u istom repou, bez potrebe za odvojenim servisom koji bi trebalo uvoziti/izvoziti.

---

## Architecture Lock — Single-tenant, single-user

Clarion NIJE multi-tenant.

- Nema `organization_id` nigde u šemi
- Nema role sistema — postoji samo jedan korisnik
- Nema signup/invite flow-a — nalog je ručno seedovan

> Ako se nađeš da pišeš RLS politiku po organizaciji ili role-check logiku za više tipova korisnika — stani. To ne pripada ovom projektu.

---

## Architecture Lock — Vector store

**Supabase pgvector, ne poseban vector store.**

Ne uvoditi Pinecone, Weaviate, ili bilo koji dodatni servis za embeddings. Isti Postgres koji drži sve ostale tabele drži i `document_chunks` sa `vector` kolonom. Isti obrazac dokazan u Respondly, ponovljen ovde.

---

## Architecture Lock — Deljena osnova za oba feature-a

RAG chat i document comparison **dele istu parsing/chunking infrastrukturu** (`documents`, `document_chunks`, ingestion logika). Comparison feature ne sme da uvede paralelni, drugačiji parsing pipeline — razlika je samo u tome šta se radi sa parsiranim sadržajem nakon toga (chat retrieval vs. side-by-side analiza).

> Ako se nađeš da pišeš drugi parser ili drugu chunking logiku za comparison feature — stani. Iskoristi ono što već postoji za RAG chat.

---

## Lock — DOCX generisanje

**`docx` (npm) biblioteka, server-side, unutar iste Next.js app-a.** Ne uvoditi Python/FastAPI servis samo zbog DOCX generisanja — `docx` paket je dovoljno zreo za naslov, rezime, i tabelu razlika koje ovaj projekat zahteva. Pun brend-matching template (tačne boje, logo u headeru) je namerno van scope-a — vidi `PRODUCT_MASTER.md` §7.

---

## Lock — Frontend workflow (Cursor → Claude Code UI polish prolazak)

Backend logika se gradi prva, u Cursor-u. Tek kada backend radi end-to-end (i sa minimalnim UI), otvara se **posebna Claude Code sesija** koja radi direktno u istom repou — nema GitHub import/export koraka, nema drugog alata.

**U toj sesiji se dira samo UI komponente i izgled stranica.** Nikad backend rute, API logiku, ili šemu baze. Za razliku od Lovable-a (koji je imao svoj sandbox i uvoz/izvoz kao prirodnu granicu), Claude Code ima pun pristup repou — ovo ograničenje je **samo-nametnuta disciplina, ne tehničko ograničenje alata**, i tretira se jednako strogo. Git diff nakon svake polish sesije se pregleda pre commit-a.

> Ako se u toku UI polish prolaska nađeš da menjaš `app/api/*` ili `lib/*` — stani, čak i ako "izgleda bezazleno". To nije deo ovog prolaska.

---

## Lock — Šta se NE gradi

Ne uvoditi:

- Multi-tenancy ili role sistem
- Povezivanje spoljnih izvora (Notion, Google Drive, GitHub) kao izvor dokumenata — samo upload
- Poređenje više od dva dokumenta odjednom
- Enterprise integracije (Slack, Jira, HubSpot)
- Pun brend-matching Word template
- Multi-language podršku
- Kompleksan analytics dashboard
- Realtime sync ili multi-user kolaboraciju

> Pravilo: ako feature deluje kao infrastruktura za skalu koju ovaj projekat nikad neće videti — ne pripada ovde.

**Izuzetak (Amandman v1.1):** minimalna Dashboard stranica (pregled nedavne aktivnosti + navigacija ka `/chat` i `/compare`) je namerno dodata radi realističnijeg izgleda za screenshot-portfolio. Ovo NIJE "kompleksan analytics dashboard" sa liste iznad — nema grafikona, metrika, ni izveštaja, samo lista nedavnih stavki i linkovi. Sve ostalo sa liste ostaje zabranjeno bez izuzetka.

---

## Lock — Naming Convention

`snake_case` svuda, i u bazi i u API payload-ima:

**Ispravno:** `document_id`, `comparison_id`, `cited_chunk_ids`, `source_file`

**Pogrešno:** `documentId`, `comparisonId`, `citedChunkIds`

---

## Lock — Jezik aplikacije

**User-facing sadržaj je na engleskom.** UI tekst, dugmad, labele, poruke grešaka, empty state poruke, i sadržaj generisanog DOCX izveštaja — sve što korisnik/Loom gledalac vidi — na engleskom je, pošto je demo scenario (Ridgeline Renovations) i ciljna Upwork publika engleska.

Kod komentari, commit poruke, i `docs/` specifikacija ostaju na srpskom — to je radni jezik projekta, ne user-facing sadržaj.

> Ako pišeš tekst koji se renderuje u `/chat`, `/compare`, ili u generisanom `.docx` fajlu — mora biti na engleskom, bez izuzetka.

---

## Lock — Zabranjene biblioteke / patterns

**Frontend — NE koristiti:**

- Redux, Zustand, TanStack Query (component state + server components su dovoljni)
- Bootstrap, Material UI, Chakra UI, Styled Components
- Framer Motion (nema potrebe za animacijama na ovom obimu)

**Backend — NE koristiti:**

- Prisma, NestJS, Express backend
- Redis
- Posebni mikroservisi (uključujući poseban servis za parsing/DOCX generisanje)
- Separate vector database
- Python/FastAPI kao drugi backend servis (vidi Architecture Lock iznad)

---

## MVP Philosophy

```
Simple > clever
Working demo > scalable product
Realni demo dokumenti > lorem ipsum
Screenshotovi + live deploy > interaktivan demo (Amandman v1.1 — ranije: Loom + live deploy)
Čist, čitljiv DOCX izveštaj > kompleksan template
```

---

## Demo Integrity Rule

Sve što se pokazuje u Loom-u i proposal-u mora biti iskreno:

- Realni (ne lažni) demo dokumenti, pravi live deploy — ovo NIJE laganje, ovo je legitiman demo setup
- **Nikad**: lažni broj korisnika, izmišljeni testimonijali, ili implikacija da postoji pravi klijent
- Proposal-i moraju biti transparentni da je ovo demo/portfolio projekat, ne pravi klijentski rad
- Bez Loom naracije (Amandman v1.1), ta transparentnost mora biti eksplicitna u README-u i portfolio tekstu koji prati screenshotove — ne sme se osloniti na to da je "očigledno" iz konteksta

---

## Final Reminder

Najveći rizici projekta:

- Scope creep ka "pravom SaaS proizvodu" (role sistem, multi-tenancy, settings stranica)
- Duplirana parsing/chunking logika između RAG chat i comparison feature-a umesto deljene osnove
- Potcenjivanje vremena za DOCX generisanje sa formatiranjem — obično traje duže nego što deluje
- UI polish sesija koja skrene u backend kod umesto da ostane na UI-ju
- Gubljenje fokusa sa 2 core stvari koje projekat treba da dokaže: RAG chat sa citatima, i document comparison sa generisanim izveštajem
- Dashboard/sidebar dodatak (Amandman v1.1) koji prerasta u stvarne nove funkcije umesto da ostane pregled + navigacija

---

_Clarion PROJECT MEMORY · v1.0 · Portfolio Project_
