# RAG chat test pitanja — demo-documents korpus

Upload za chat demo (4 odvojena dokumenta):

- `scope-of-work.txt`
- `material-spec-sheet.txt`
- `permit-application.txt`
- `prior-vendor-quote.txt`

## In-corpus (odgovor mora postojati u dokumentu, sa citatom)

- What's the estimated completion timeline? → 6 weeks (`scope-of-work.txt`)
- What's the total budget for this project? → $18,750 (`scope-of-work.txt`)
- What quartz did the homeowner request? → Cambria "Brittanicca" (`material-spec-sheet.txt`)
- What's the permit number? → RR-2026-0142 (`permit-application.txt`)
- Who is the project lead? → Sarah Whitfield (`scope-of-work.txt` / `material-spec-sheet.txt`)
- What cabinet hardware finish was chosen? → brushed brass, sourced from Emtek (`material-spec-sheet.txt`)
- What was Harbor Cabinetry's total quoted amount? → $8,030 (`prior-vendor-quote.txt`)

## Out-of-corpus (mora odgovoriti "ne znam", ne sme da izmisli)

- What's the warranty on the cabinets?
- Who is the electrical subcontractor?
- What brand of paint will be used for the walls?
- Is there a change order process?

Svrha: proveriti da min_similarity prag (0.2) tačno razdvaja odgovorljiva od neodgovorljivih pitanja — ne sme biti lažnih "ne znam" na in-corpus, ni izmišljenih odgovora na out-of-corpus.
