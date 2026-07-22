**Clarion**

Dokumentacija proizvoda — v1.0

AI asistent za dokumenta — chat sa citatima i poređenje sa generisanim izveštajem

Portfolio / R&D projekat · Ne za produkciju

---

**1. Šta je Clarion**

Clarion je radeći demo AI alata za rad sa dokumentima, izgrađen nad zajedničkom osnovom za parsiranje i razumevanje sadržaja. Korisnik učitava svoje fajlove (PDF, DOCX, TXT) i može da radi dve stvari: postavlja pitanja o njima kroz chat koji svaki odgovor potkrepljuje citatom izvora, ili učita dva dokumenta jedan pored drugog da dobije AI analizu razlika, upakovanu u čist, profesionalan Word izveštaj.

Demo scenario prati fiktivnu malu građevinsku/renovacionu firmu, Ridgeline Renovations — vlasnik učitava dve ponude izvođača za kuhinjski remont da ih uporedi, i odvojeno koristi chat da postavlja pitanja o projektnoj dokumentaciji (specifikacije materijala, dozvole, prethodne ponude).

Ovo nije proizvod namenjen pravim korisnicima. To je dokaz da dva povezana obrasca — RAG chat sa citatima nad učitanim dokumentima, i AI poređenje dva dokumenta sa generisanim Word izveštajem — rade pouzdano, u jednom malom ali potpuno funkcionalnom sistemu koji deli istu osnovu za oba.

**2. Korisnici**

Clarion ima samo jednu stranu, bez sistema uloga:

| **Strana** | **Ko je**                      | **Pristup**                               |
| ---------- | ------------------------------ | ----------------------------------------- |
| Korisnik   | Vlasnik/osoblje fiktivne firme | Jedan nalog, pristup `/chat` i `/compare` |

Nema registracije, nema verifikacije, nema više naloga. Ovo je namerno — vidi §7.

**3. Kako izgleda chat sa dokumentima**

| **#** | **Korak**                             | **Šta se dešava**                                                                                   |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1     | Korisnik učita dokumente              | Npr. specifikacija materijala, dozvola, prethodna ponuda                                            |
| 2     | Sistem parsira i indeksira sadržaj    | Tekst se izvlači, deli na delove, i pretvara u embeddings za pretragu                               |
| 3     | Korisnik postavlja pitanje            | Npr. "Koji je rok za završetak radova prema dozvoli?"                                               |
| 4     | Sistem pretražuje indeksirani sadržaj | Pitanje se poredi sa učitanim dokumentima, pronalaze se najrelevantniji delovi                      |
| 5     | AI piše odgovor sa citatom            | Odgovor je zasnovan isključivo na pronađenom sadržaju, uz jasnu oznaku iz kog dokumenta/dela dolazi |
| 6     | Ako pitanje nije pokriveno            | Sistem to i kaže, ne izmišlja odgovor                                                               |

**4. Kako izgleda poređenje dokumenata**

| **#** | **Korak**                          | **Šta se dešava**                                                         |
| ----- | ---------------------------------- | ------------------------------------------------------------------------- |
| 1     | Korisnik učita tačno dva dokumenta | Npr. dve ponude izvođača za isti posao                                    |
| 2     | Sistem parsira oba dokumenta       | Isti parsing pipeline kao chat funkcija                                   |
| 3     | AI analizira razlike               | Cene, nedostajuće stavke, razlike u obimu posla, razlike u uslovima       |
| 4     | Nalazi se prikazuju u aplikaciji   | Tabela sa kategorijom, opisom, i referencom na izvor u oba dokumenta      |
| 5     | Generiše se Word izveštaj          | Naslov, rezime, i tabela razlika — čist i čitljiv, spreman za preuzimanje |

**5. Zašto oba feature-a dele istu osnovu**

Ovo je centralna arhitektonska odluka projekta. Umesto da se grade dva odvojena sistema, Clarion parsira, deli na delove (chunking), i indeksira svaki učitani dokument na isti način — bez obzira da li se koristi za chat ili poređenje. Chat funkcija zatim pretražuje taj indeks po relevantnosti (top-k retrieval), dok poređenje uzima ceo sadržaj oba dokumenta odjednom, jer poređenje zahteva potpun uvid, ne samo najrelevantnije delove. Ova podela — jedna osnova, dva načina korišćenja — znači da drugi feature ne zahteva skoro nikakav dodatni rad na parsiranju, samo novu logiku iznad postojećeg.

**6. Generisani Word izveštaj**

Rezultat poređenja nije samo prikaz na ekranu — to je i preuzimljiv `.docx` fajl sa jasnom strukturom: naslov koji imenuje upoređene dokumente, kratak rezime nalaza, i tabela sa svakom pojedinačnom razlikom (kategorija, opis, gde se nalazi u svakom dokumentu). Ne radi se o punom brend-matching template-u sa logom i tačnim bojama klijenta — cilj je čist, profesionalan izgled koji deluje kao nešto što bi neko stvarno poslao klijentu ili koleginici, ne sirovi debug izlaz.

**7. Šta je namerno izostavljeno**

Clarion nije umanjena verzija pravog proizvoda — to je fokusiran dokaz dva obrasca, i sve što ne služi tom cilju je isključeno:

| **Nije uključeno**                                  | **Zašto**                                               |
| --------------------------------------------------- | ------------------------------------------------------- |
| Povezivanje spoljnih izvora (Notion, Drive, GitHub) | Upload fajlova je dovoljan da dokaže obrazac            |
| Enterprise integracije (Slack, Jira, HubSpot)       | Van opsega demo obima                                   |
| Pun brend-matching Word template                    | Čist, strukturisan izveštaj je dovoljan                 |
| Poređenje više od dva dokumenta                     | Dva dokumenta dovoljno pokazuju da poređenje radi tačno |
| Multi-tenant/više korisnika                         | Jedan korisnik je dovoljan                              |
| Multi-language podrška                              | Van opsega demo obima                                   |

**8. Radni proces izrade**

Backend logika (parsing, RAG, poređenje, DOCX generisanje) gradi se prva, u Cursor-u. Kada backend radi kraj-do-kraja, otvara se posebna Claude Code sesija koja radi direktno u istom repou radi doterivanja frontenda — nema push/import koraka ka trećem alatu. Ta sesija dira samo UI komponente, nikad backend rute ili logiku; pošto Claude Code ima pun pristup repou (za razliku od alata sa sopstvenim sandbox-om), to je samo-nametnuto pravilo koje se prati jednako strogo, uz pregled git diff-a pre svakog commit-a. Ovaj dvostepeni pristup (backend prvo, UI polish odvojeno u posebnoj sesiji) je odgovor na to da finalni izgled prethodnog portfolio projekta (Respondly) nije u potpunosti zadovoljio — odvojena, fokusirana polish sesija je uvedena specifično da poboljša taj korak bez ugrožavanja već radeće backend strukture.

**9. Pozicioniranje**

Clarion nastaje direktno iz analize stvarnih Upwork poslova koji traže "chat sa vašim dokumentima," poređenje ugovora/ponuda, ili AI-generisan izveštaj kao isporuku — obrasce koje dosadašnji portfolio (uključujući Respondly) nije pokrivao. Cilj nije zameniti pravi proizvod, nego dati konkretan, proverljiv primer (dva kratka snimka + živ deploy) koji potencijalni klijent može sam da vidi, umesto da veruje samo opisu u proposal-u.

---

_Clarion · Dokumentacija proizvoda · v1.0 · Portfolio Project_
