# Clarion

## Faza 5 — Claude Code Frontend Polish

Cursor → Claude Code UI polish prolazak

---

## Kontekst

Do ovde je backend (Faze 0–4) funkcionalan end-to-end, sa minimalnim, neispoliranim UI-jem građenim u Cursor-u. Ova faza je posvećena isključivo vizuelnom doterivanju — nema nove backend logike.

Pre polish prolaska zatvoren je i Amandman v1.1 gap: funkcionalni `/dashboard` + trajni sidebar (Clarion brand + Ridgeline Renovations workspace) — vidi `FRONTEND_MASTER.md` §17. Dashboard/sidebar su funkcionalni, neispolirani; vizuelno doterivanje ide u istoj Claude Code sesiji kao login/chat/compare.

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

Handoff prompt za Claude Code sesiju: `docs/phases/faza_5_brief.md`.

## Šta se doteruje

- Login stranica: Clarion branding (logo, ime), čist error state
- Sidebar + `/dashboard`: Clarion brand, Ridgeline workspace ime, navigacija; welcome header, quick stats, recent lists, empty state (Amandman v1.1 / `FRONTEND_MASTER.md` §17)
- `/chat`: dvopanelni layout, citation badge stil, empty/loading states; nezavisno skrolovanje panela (lista dokumenata vs chat thread + fiksirani input)
- `/compare`: upload koraci, findings tabela, download dugme, processing indikator
- Responzivnost: sidebar collapse na mobilnom, dvopanelni chat layout kolabira na mobilnom, findings tabela scroll-uje horizontalno
- Vizuelni pravac: shadcn defaults + Clarion branding (ime, favicon, accent boja) — bez custom ilustracija/animacija

Puna specifikacija: `FRONTEND_MASTER.md` §7, §8, §11, §14, §17. Detaljan per-page checklist: `faza_5_brief.md`.

---

## Faza 5 — Checklist

| #   | Zadatak                                                                         | Status |
| --- | ------------------------------------------------------------------------------- | ------ |
| 1   | Oba flow-a + dashboard/sidebar verifikovani end-to-end pre polish prolaska      | [x]    |
| 2   | Claude Code sesija otvorena na istom repou (bez GitHub import/export)           | [x]    |
| 3   | Login stranica doterana (branding, error state)                                 | [x]    |
| 4   | Sidebar + `/dashboard` doterani (brand, workspace, stats, liste, empty state)   | [x]    |
| 5   | `/chat` doteran (layout, citation stil, empty/loading, nezavisno skrolovanje)   | [x]    |
| 6   | `/compare` doteran (upload, findings tabela, download dugme, progress)          | [x]    |
| 7   | Responzivne provere na mobilnom viewport-u                                      | [x]    |
| 8   | Git diff pregledan pre commit-a — nema izmena u `app/api/` ili `lib/`           | [x]    |
| 9   | Oba flow-a + dashboard ponovo verifikovani nakon polish prolaska (regresija)    | [x]    |

Verifikovano ručnim testiranjem (screenshotovi): login sa Clarion mark-om i accent bojom, dashboard sa realnim brojkama i ikonama, chat sa nezavisnim skrolovanjem panela (input fiksiran na dnu), compare sa obojenim category badge-ovima na desktop i mobilnom (sidebar collapse). Git diff pregledan — sve realne izmene van `components/**`/`app/**/page.tsx` presentation dela (`proxy.ts`, `lib/auth/guard.ts`) potvrđene kao legitiman rad iz koraka 1-2 (Amandman v1.1 funkcionalna izgradnja), ne kršenje UI-only scope-a. Code review runda (10 nalaza, 4 popravljena, 6 svesno van scope-a) prošla nakon toga.

---

_Clarion · Faza 5 · Claude Code Frontend Polish · Povjerljivo_
