# Clarion

## SECURITY — v1.0

> **OVAJ DOKUMENT JE JEDINI IZVOR ISTINE ZA:**
>
> - Javne vs zaštićene rute
> - Server-side only operacije
> - Zaštita upload rute
> - Osetljivi podaci i environment varijable
> - Security checklist

---

## 1. JAVNE VS ZAŠTIĆENE RUTE

Clarion je sigurnosno jednostavniji od multi-tenant sistema — postoji samo jedan korisnik i nema spoljnih webhook izvora — ali osnovna pravila i dalje važe.

| Route                      | Ko vidi           | Auth potreban |
| -------------------------- | ----------------- | ------------- |
| `/login`                   | Svi (neulogovani) | Ne            |
| `/chat`                    | Korisnik          | Da            |
| `/compare`                 | Korisnik          | Da            |
| `/api/documents/upload`    | Korisnik          | Da            |
| `/api/chat`                | Korisnik          | Da            |
| `/api/compare`             | Korisnik          | Da            |
| `/api/compare/[id]/report` | Korisnik          | Da            |

> **Napomena:** za razliku od Respondly, Clarion nema javno dostupnu webhook rutu (nema spoljnjeg servisa koji šalje podatke bez sesije) — sve API rute zahtevaju ulogovanog korisnika. Ovo pojednostavljuje sigurnosni model u odnosu na Respondly, gde je webhook signature verifikacija bila najkritičnija tačka.

### Middleware pravila

Next.js middleware (`proxy.ts` u Next.js 16+) mora:

- Primeniti basic-auth zavesu na sve rute osim statičkih asset-a bez osetljivih podataka (`_next/static`, `_next/image`, `favicon.ico`, slike — standardna Next.js matcher praksa) (env: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`) — dodatna zaštita preko edge-a; Supabase Auth ostaje prava zaštita za `/chat` i `/compare`
- Redirectovati neulogovane korisnike sa `/chat` i `/compare` na `/login`
- Primeniti auth proveru na sve `/api/*` rute osim `/login`-related auth endpoint-a

---

## 2. SERVER-SIDE ONLY

> ⚠️ Sledeće operacije NIKAD ne smeju biti na klijentu (browser).

| Operacija                                            | Razlog                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Supabase `service_role` key operacije                | Zaobilazi RLS — koristi se u upload, ingestion, i comparison rutama                                           |
| LLM API pozivi (chat generacija, comparison analiza) | API ključ ne sme biti izložen klijentu                                                                        |
| Embedding API pozivi (ingestion i query)             | API ključ server-side only                                                                                    |
| DOCX generisanje (`docx` paket)                      | Fajl se generiše server-side i upload-uje u Storage; klijent samo preuzima gotov fajl                         |
| Parsing uploaded fajlova (`pdf-parse`, `mammoth`)    | Sprečava izvršavanje proizvoljnog koda iz uploaded fajla na klijentu; parsing se dešava isključivo na serveru |

---

## 3. RLS (ROW LEVEL SECURITY)

Clarion nema multi-tenancy, pa RLS politike nisu organizacione — ali i dalje treba da postoje kao osnovna zaštita, pošto `NEXT_PUBLIC_SUPABASE_ANON_KEY` je javan.

| Tabela                               | Ko može čitati (anon key)                                                      | Ko može pisati (anon key)                     |
| ------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------- |
| `documents`, `document_chunks`       | Niko direktno — čitanje ide isključivo kroz server-side kod sa proverom sesije | Niko — samo server-side upload/ingestion ruta |
| `chat_sessions`, `chat_messages`     | Niko direktno sa klijenta                                                      | Niko — samo server (chat ruta)                |
| `comparisons`, `comparison_findings` | Niko direktno sa klijenta                                                      | Niko — samo server (compare ruta)             |
| `generated_reports`                  | Niko direktno — download ide kroz server-side rutu koja proverava sesiju       | Niko — samo server (report generisanje)       |

**Pravilo:** anon key se praktično nigde ne koristi za direktan read/write iz browsera — sve prolazi kroz Next.js server komponente ili API rute koje koriste `service_role` sa eksplicitnom auth proverom.

---

## 4. UPLOAD SIGURNOST

**Najosetljivija tačka u projektu** — Clarion prima proizvoljne fajlove od korisnika (PDF/DOCX/TXT) i parsira ih server-side.

- Validirati file type (MIME type + ekstenzija) pre parsiranja — odbaciti sve što nije PDF/DOCX/TXT
- Ograničiti veličinu fajla (npr. max 10–15MB po fajlu) — demo dokumenti su kratki, nema razloga za veće limite
- Parsing biblioteke (`pdf-parse`, `mammoth`) se pozivaju isključivo server-side, nikad se ne izvršava sadržaj fajla — samo se čita tekst
- Upload ruta zahteva validnu sesiju (§1) — nema anonimnog upload-a
- Supabase Storage bucket za uploaded fajlove nije javno čitljiv — pristup ide kroz server-side signed URL ili server-side proxy rutu, ne direktan public URL

---

## 5. API SIGURNOST

- Session validacija na svakom `/chat`, `/compare`, i `/api/*` zahtevu (Supabase Auth)
- Input validacija (Zod) na svim API rutama, naročito na upload (file type/size) i compare (tačno dva document ID-a, oba `purpose = comparison`)
- Nikad ne verovati klijentskom inputu za `comparisons.status` — status transition (`processing` → `completed`/`failed`) mora biti server-side, postavljen isključivo od strane backend logike koja izvršava poređenje

### Rate limiting

| Ruta                    | Limit                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `/login`                | 5 pokušaja / minuta po IP                                                             |
| `/api/documents/upload` | Razuman throttle da se spreči abuse tokom demo perioda (npr. max N upload-a / minuta) |
| `/api/compare`          | Razuman throttle — poređenje je skuplja operacija (puni LLM poziv + DOCX generisanje) |

---

## 6. SECURITY CHECKLIST

> Koristiti pre deploy-a na javni demo URL.

| #   | Zadatak                                                                                               | Status |
| --- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1   | `/chat` i `/compare` zaštićeni middleware-om (`proxy.ts`)                                             | [x]    |
| 2   | `SUPABASE_SERVICE_ROLE_KEY` korišćen isključivo server-side                                           | [x]    |
| 3   | LLM i embedding API ključevi server-side only                                                         | [x]    |
| 4   | `NEXT_PUBLIC_` prefiks samo na zaista javnim ključevima                                               | [x]    |
| 5   | Input validacija (Zod) na upload i compare rutama                                                     | [x]    |
| 6   | File type/size validacija na upload ruti implementirana i ručno verifikovana (nema automatizovanih testova) | [x]    |
| 7   | Supabase Storage bucket nije javno čitljiv — download ide kroz server-side rutu                       | [x]    |
| 8   | Status transition logika (`comparisons`) je server-side, ne poverena klijentu                         | [x]    |
| 9   | Nema secret-a u git repozitorijumu (proveri `.env` u `.gitignore`)                                    | [x]    |
| 10  | Ako je demo URL javan bez logina, basic-auth je postavljen na edge-u (sve rute osim statičkih asset-a bez osetljivih podataka) | [x]    |
| 11  | Git diff iz Claude Code UI polish sesije pregledan pre commit-a — nema izmena u `app/api/` ili `lib/` | [x]    |

---

_Clarion SECURITY · v1.0 · Portfolio Project_
