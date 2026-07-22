# Clarion — Execution Phases Index

Detaljne specifikacije po fazi su u zasebnim dokumentima (format po uzoru na Respondly), umesto u jednom sažetom fajlu. Svaka faza je samostalna — sadrži kontekst, tačne flow-ove/tabele/šeme i checklist, i ne zahteva skakanje po drugim master dokumentima za osnovne detalje.

| Faza | Dokument                                | Dokazuje                                                                              |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| 0    | `faza_0_setup_tech_stack.md`            | — (infrastruktura + Shared Foundations)                                               |
| 1    | `faza_1_upload_parsing_ingestion.md`    | Deljena osnova — upload, parsing, chunking, embeddings (koristi je i Faza 2 i Faza 3) |
| 2    | `faza_2_rag_chat.md`                    | RAG chat sa citatima izvora                                                           |
| 3    | `faza_3_document_comparison.md`         | AI poređenje dva dokumenta, strukturisani nalazi                                      |
| 4    | `faza_4_docx_report_generation.md`      | Generisanje strukturisanog Word izveštaja                                             |
| 5    | `faza_5_claude_code_frontend_polish.md` | Cursor → Claude Code UI polish prolazak                                               |
| 6    | `faza_6_demo_polish_deploy.md`          | — (verodostojnost demo-a, deploy)                                                     |
| 7    | `faza_7_loom_case_study.md`             | — (deliverable za proposal-e, 2 snimka)                                               |

**Napomena o arhitekturi:** Faza 0 uspostavlja set deljenih modula (`Shared Foundations`) koje sve ostale faze koriste bez ponovne inicijalizacije — Supabase klijent, LLM klijent, embedding helper, auth guard, document parsing helperi. Pri pisanju ili reviziji bilo koje faze, prvo proveriti da li već postoji deljeni modul za tu potrebu pre nego što se piše nova implementacija.

**Napomena o deljenoj osnovi (Faza 1):** Faza 1 gradi upload/parsing/chunking pipeline jednom, koriste je i RAG chat (Faza 2) i document comparison (Faza 3). Ovo je namerna arhitektonska odluka — vidi `PROJECT_MEMORY.md`, Architecture Lock — Deljena osnova za oba feature-a. Comparison feature (Faza 3) ne sme graditi paralelni parsing pipeline.

**Napomena o frontend workflow-u (Faza 5):** Za razliku od Respondly, gde je ceo frontend građen direktno u Cursor-u, Clarion prolazi kroz dodatni korak — backend + minimalan funkcionalan UI grade se u Cursor-u (Faze 0–4), zatim se otvara posebna Claude Code sesija koja radi direktno u istom repou za doterivanje UI-ja (Faza 5) — nema GitHub import/export koraka. Ta sesija dira samo UI komponente, nikad backend rute ili šemu — samo-nametnuto pravilo, pošto Claude Code ima pun pristup repou. Vidi `FRONTEND_MASTER.md` §14 za pun workflow i `PROJECT_MEMORY.md` za tvrdo pravilo.

Ostali master dokumenti (`PRODUCT_MASTER.md`, `FRONTEND_MASTER.md`, `BACKEND_MASTER.md`, `PROJECT_MEMORY.md`, `SECURITY.md`) i dalje važe kao izvor istine za cross-cutting pravila (šta se ne gradi, naming convention, security checklist itd.) — fazni dokumenti implementiraju ta pravila, ne zamenjuju ih.

_Clarion · Execution Phases Index · v1.0 · Portfolio Project_
