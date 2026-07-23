# RAG chat test pitanja — chat-test-corpus.txt

## In-corpus (odgovor mora postojati u dokumentu, sa citatom)

- What's the estimated completion timeline?  → 6 weeks
- What's the total budget for this project?  → $18,750
- What quartz did the homeowner request?  → Cambria "Brittanicca"
- What's the permit number?  → RR-2026-0142
- Who is the project lead?  → Sarah Whitfield
- What cabinet hardware finish was chosen?  → brushed brass, sourced from Emtek

## Out-of-corpus (mora odgovoriti "ne znam", ne sme da izmisli)

- What's the warranty on the cabinets?
- Who is the electrical subcontractor?
- What's the payment schedule?
- Is there a change order process?

Svrha: proveriti da min_similarity prag (0.2) tačno razdvaja odgovorljiva od neodgovorljivih pitanja — ne sme biti lažnih "ne znam" na in-corpus, ni izmišljenih odgovora na out-of-corpus.
