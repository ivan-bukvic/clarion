# Clarion

## Faza 5 — Claude Code Frontend Polish

Cursor → Claude Code UI polish prolazak

---

## Kontekst

Do ovde je backend (Faze 0–4) funkcionalan end-to-end, sa minimalnim, neispoliranim UI-jem građenim u Cursor-u. Ova faza je posvećena isključivo vizuelnom doterivanju — nema nove backend logike.

## Zašto poseban prolazak umesto Lovable-a

Prethodni portfolio projekat (Respondly) je ceo frontend gradio direktno u Cursor-u, i finalni izgled nije u potpunosti zadovoljio. Za Clarion je razmatran Lovable (uvoz repoa preko GitHub-a, doterivanje UI-ja, push nazad), ali je odlučeno da se umesto toga koristi **posebna Claude Code sesija koja radi direktno u istom repou** — bez GitHub import/export koraka, bez trećeg alata u workflow-u.

## Pravilo

U ovoj sesiji se dira **samo** UI komponente i izgled stranica (`components/`, page-level layout/styling u `app/**/page.tsx`) — nikad backend rute, API logika, ili šema baze.

> Za razliku od Lovable-a, koji je imao sopstveni sandbox i uvoz/izvoz kao prirodnu granicu, Claude Code ima pun pristup repou. Ovo ograničenje je **samo-nametnuta disciplina, ne tehničko ograničenje alata** — tretirati ga jednako strogo.

## Workflow

```
1. Verifikovati da oba flow-a (chat i comparison) rade end-to-end protiv realnih
   demo dokumenata, pre početka polish prolaska
2. Otvoriti posebnu Claude Code sesiju na istom repou
3. Raditi isključivo na UI/component fajlovima
4. Nakon sesije: pregledati git diff pre commit-a — odbaciti svaku izmenu koja
   dira app/api/, lib/, ili schema/migration fajlove
5. Deploy doteranog rezultata na Vercel (Faza 6)
```

## Šta se doteruje

- Login stranica: Clarion branding (logo, ime), čist error state
- `/chat`: dvopanelni layout, citation badge stil, empty/loading states
- `/compare`: upload koraci, findings tabela, download dugme, processing indikator
- Responzivnost: dvopanelni chat layout kolabira na mobilnom, findings tabela scroll-uje horizontalno
- Vizuelni pravac: shadcn defaults + Clarion branding (ime, favicon, accent boja) — bez custom ilustracija/animacija

Puna specifikacija: `FRONTEND_MASTER.md` §7, §8, §11, §14.

---

## Faza 5 — Checklist

| #   | Zadatak                                                                | Status |
| --- | ---------------------------------------------------------------------- | ------ |
| 1   | Oba flow-a verifikovana end-to-end pre početka polish prolaska         | [ ]    |
| 2   | Claude Code sesija otvorena na istom repou (bez GitHub import/export)  | [ ]    |
| 3   | Login stranica doterana (branding, error state)                        | [ ]    |
| 4   | `/chat` doteran (layout, citation stil, empty/loading states)          | [ ]    |
| 5   | `/compare` doteran (upload, findings tabela, download dugme, progress) | [ ]    |
| 6   | Responzivne provere na mobilnom viewport-u                             | [ ]    |
| 7   | Git diff pregledan pre commit-a — nema izmena u `app/api/` ili `lib/`  | [ ]    |
| 8   | Oba flow-a ponovo verifikovana nakon polish prolaska (regresija)       | [ ]    |

---

_Clarion · Faza 5 · Claude Code Frontend Polish · Povjerljivo_
