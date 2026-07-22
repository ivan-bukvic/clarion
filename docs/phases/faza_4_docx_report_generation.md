# Clarion

## Faza 4 — DOCX Report Generation

Generisanje strukturisanog Word izveštaja

---

## Kontekst

**Najvidljiviji artefakt celog demo-a** — vidi `PROJECT_MEMORY.md`. Poređenje dokumenata bez čistog, čitljivog DOCX izlaza ne dokazuje ništa; ovo je deo koji klijent najduže gleda i pamti. Ne žuriti kroz formatiranje.

## Šema (referenca — puna definicija u `BACKEND_MASTER.md` §3)

| Tabela              | Svrha                                                          |
| ------------------- | -------------------------------------------------------------- |
| `generated_reports` | Jedan red po generisanom `.docx` fajlu, vezan za `comparisons` |

## Generisanje flow

```
1. Trigger: automatski kad comparisons.status postane 'completed' (kraj Faze 3)
2. Fetch comparisons red + svi comparison_findings za njega
3. Build .docx koristeći `docx` npm paket:
   - Naslov (imena upoređenih dokumenata)
   - Rezime pasus (comparisons.summary)
   - Tabela nalaza (kategorija, opis, source A ref, source B ref)
4. Upload generisanog fajla u Supabase Storage
5. Insert u generated_reports (file_url)
```

## Zahtevi za formatiranje

- Čist, strukturisan izgled — pravi naslovi, prava tabela, čitljiv razmak
- **Nije** pun brend-matching template (nema logo u header-u, nema tačnih boja klijenta) — vidi `PRODUCT_MASTER.md` §7
- Cilj: izveštaj mora izgledati kao nešto što bi neko stvarno poslao klijentu, ne sirov debug izlaz
- Ovo je najviše-scrutinizovan output celog demo-a — vredi realno vreme na formatiranje, čak i kad "ne deluje kao AI deo"

## Download flow

- Download ide kroz server-side rutu (`/api/compare/[id]/report`) koja proverava sesiju — Storage bucket nije javno čitljiv, vidi `SECURITY.md` §3
- UI: "Download Report" dugme na `/compare` stranici nakon što se comparison završi

## Error handling (ova faza)

| Kod                      | Trigger                                        |
| ------------------------ | ---------------------------------------------- |
| `DOCX_GENERATION_FAILED` | `docx` paket je bacio grešku pri build-u fajla |

Failed DOCX generisanje ne sme da sakrije već završen comparison — nalazi ostaju vidljivi u UI-ju čak i ako izveštaj nije uspeo, uz jasnu poruku i retry opciju za samo generisanje izveštaja.

---

## Faza 4 — Checklist

| #   | Zadatak                                                                   | Status |
| --- | ------------------------------------------------------------------------- | ------ |
| 1   | `generated_reports` tabela                                                | [ ]    |
| 2   | `docx` paket instaliran i konfigurisan                                    | [ ]    |
| 3   | Template: naslov + rezime + tabela nalaza                                 | [ ]    |
| 4   | Automatski trigger nakon `comparisons.status = 'completed'`               | [ ]    |
| 5   | Upload generisanog fajla u Supabase Storage                               | [ ]    |
| 6   | Server-side download ruta (`/api/compare/[id]/report`) sa proverom sesije | [ ]    |
| 7   | "Download Report" dugme u UI                                              | [ ]    |
| 8   | Error handling za `DOCX_GENERATION_FAILED`, sa retry opcijom              | [ ]    |
| 9   | Vizuelna provera: izveštaj otvoren u Word-u izgleda čisto i profesionalno | [ ]    |
| 10  | Test: generisan izveštaj za realno demo poređenje (Ridgeline ponude)      | [ ]    |

---

_Clarion · Faza 4 · DOCX Report Generation · Povjerljivo_
