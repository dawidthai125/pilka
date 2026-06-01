# ETAP 15B.2 — Research: automatyczne pobieranie terminarzy, wyników i tabel

**Data researchu:** 2026-06-01  
**Status:** RESEARCH ONLY — bez implementacji, migracji i kodu integracyjnego  
**Status biznesowy (P0):** wniosek do DZPN i PZPN **wysłany** (2026-05-31) — **oczekiwanie na odpowiedź**  
**Klub referencyjny:** Piorun Wawrzeńczyce (nazwa ligowa: **GLKS Mietków**, DZPN, sezon 2025/2026)  
**Wymaganie biznesowe:** aktualizacja tabeli / terminarza / wyników **bez ręcznego importu** przez właściciela, prezesa ani trenera.

Powiązane: [ETAP 15B League Hub](../modules/stage-15b-league-hub.md), [ETAP 10 integracje](../modules/stage-10-integrations.md), probe lokalny (`tmp-dzpn-probe-report.json`).

---

## 1. Executive summary

### Źródło prawdy w polskiej piłce nożnej

Oficjalne dane rozgrywkowych (terminarz, wynik, tabela, składy, kartki) powstają w **Extranet PZPN** — wpisywane przez sędziów i kluby. Stamtąd trafiają do **wewnętrznej szyny danych PZPN** (Apache NiFi), a następnie do:

- aplikacji **mPZPN**,
- portalu **Łączy nas piłka** (`competition-api-pro.laczynaspilka.pl`),
- CMS PZPN (Droptica / Drupal).

**Nie istnieje publiczne, dokumentowane API piłkarskie** analogiczne do np. ZPRP (`rozgrywki.zprp.pl/api/` — piłka ręczna, jawne JSON).

### Werdykt researchu

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy da się dziś w pełni zautomatyzować import z publicznych stron DZPN? | **Nie** — brak stabilnych plików/API ligowych po redesignie `dzpn.pl`. |
| Czy da się pobrać dane z ŁNP bez logowania? | **Nie** — `seasons/dictionaries` → **401 Unauthorized**. |
| Czy da się legalnie osiągnąć cel „zero ręcznej pracy klubu”? | **Tak, ale tylko przez oficjalny dostęp do ekosystemu PZPN** (partnerstwo / credentials API / umowa z DZPN). |
| Najlepsza ścieżka architektoniczna | **Scenariusz D → A:** umowa z PZPN/DZPN + adapter `LnpCompetitionApiAdapter` na istniejący League Hub. |

---

## 2. Metodologia oceny

Dla każdego źródła oceniono (skala **1–10**, 10 = najlepsze):

| Kryterium | Opis |
|-----------|------|
| **Legalność** | Zgodność z regulaminem, licencją danych, RODO |
| **Stabilność** | Zmiany URL, formatu, redesign stron |
| **Dostępność** | Czy dane B/A/okręgówki/juniorów są dostępne |
| **Koszt** | Wdrożenie + utrzymanie (orientacyjnie) |
| **Automatyzacja** | Możliwość cron/sync bez człowieka |
| **Ryzyko blokady** | IP ban, 401, zmiana API, pozew |

**Ocena końcowa (FIT)** = średnia ważona pod kątem celu FC OS: automatyzacja (×2), legalność (×2), stabilność (×1,5), dostępność (×1,5), koszt odwrotnie, ryzyko odwrotnie.

---

## 3. Mapa źródeł danych

### 3.1 Oficjalne — PZPN / DZPN / Extranet / ŁNP

| # | Źródło | Zakres klas | Legalność | Stabilność | Dostępność | Automatyzacja | Blokada | **FIT** |
|---|--------|-------------|-----------|------------|------------|---------------|---------|---------|
| 1 | **Extranet PZPN** | Wszystkie (B, A, okr., junior, trampkarz, młodzik) | 8 — dane klubu przy koncie klubowym; automatyzacja wymaga zgody PZPN | 9 | 10 | 9* | 3* | **8.5*** |
| 2 | **competition-api-pro.laczynaspilka.pl** | Jak mPZPN / ŁNP (cała Polska) | 7 — API istnieje, publicznie bez auth zabronione | 9 | 10 | 10* | 4* | **8.0*** |
| 3 | **mPZPN (aplikacja)** | j.w. | 6 — ten sam backend co ŁNP; brak licencji dla ISV | 9 | 10 | 2 (mobile only) | 5 | **5.0** |
| 4 | **Szyna danych PZPN (NiFi)** | Wszystkie | 9 — wyłącznie partnerzy (case Droptica) | 10 | 10 | 10* | 2* | **9.0*** |
| 5 | **DZPN dzpn.pl (WWW)** | Komunikaty, PDF, regulaminy | 9 — treści publiczne | 4 | 3 | 2 | 2 | **3.5** |
| 6 | **DZPN pliki Excel (terminarze)** | Teoretycznie B/A/okr. | 9 — pliki publiczne | 3 | 2 | 4** | 3 | **4.0** |
| 7 | **DZPN RSS / WP REST** | Aktualności (trigger) | 10 | 7 | 2 | 5 | 1 | **5.5** |

\* Przy uzyskaniu oficjalnych credentials / umowy partnerskiej.  
\*\* Przy ręcznej konfiguracji sezonowego URL + parserze — nie „zero pracy”, ale bez API.

**Potwierdzenia techniczne (ETAP 15B probe):**

- `https://dzpn.pl/rozgrywki/seniorskie/` → **404** (strona wycofana).
- Jedyny publiczny `.xlsx` w WP media: **Kalkulator ekwiwalentu** — nie terminarz.
- `competition-api-pro.../seasons/dictionaries` → **401**.
- Endpointy w JS ŁNP (odkryte w bundle): `leagues/{id}/seasons/{id}/tables`, `.../matches`, `plays/{id}/tables` — **wymagają auth**.

**Architektura PZPN (źródło: [Droptica case study](https://www.droptica.pl/case-study/headless-cms-dla-pzpn/)):**

```
Extranet (sędziowie/trenerzy) → Szyna NiFi → API → mPZPN / ŁNP / CMS
```

---

### 3.2 Nieoficjalne / agregatory

| # | Źródło | Zakres | Legalność | Stabilność | Dostępność | Automatyzacja | Blokada | **FIT** |
|---|--------|--------|-----------|------------|------------|---------------|---------|---------|
| 8 | **90minut.pl** | Szeroki amatorski (w tym niższe ligi) | 4 — scraping zwykle sprzeczny z ToS | 5 | 7 | 6 | 8 | **4.5** |
| 9 | **Futbolowo.pl** | Strony klubów, kadry DZPN | 5 | 5 | 4 | 4 | 6 | **4.0** |
| 10 | **Lokalne portale** (np. sport regionalny) | Fragmentarycznie | 6 | 3 | 3 | 3 | 4 | **3.5** |
| 11 | **Flashscore / Sofascore / LiveScore** | Głównie pro / wysokie ligi | 3 | 8 | 1 | 2 | 9 | **2.0** |

---

### 3.3 Feeds, API, widgety

| # | Źródło | Format | Legalność | Stabilność | Dostępność | Automatyzacja | Blokada | **FIT** |
|---|--------|--------|-----------|------------|------------|---------------|---------|---------|
| 12 | **RSS DZPN** (`/feed/`) | XML aktualności | 10 | 7 | 1 | 4 (trigger) | 1 | **5.5** |
| 13 | **WordPress REST DZPN** | JSON postów/media | 10 | 7 | 2 | 5 | 2 | **5.0** |
| 14 | **Publiczne REST piłki nożnej** | — | — | — | **Brak** | — | — | **1.0** |
| 15 | **GraphQL publiczny** | — | — | — | **Brak** | — | — | **1.0** |
| 16 | **Widgety tabel (iframe ŁNP)** | HTML embed | 7 — wyświetlanie OK; nie sync do DB | 8 | 8 | 1 | 2 | **3.0** |
| 17 | **ZPRP API (piłka ręczna)** | JSON | 10 | 9 | N/A (inny sport) | 10 | 1 | **N/A** |

---

### 3.4 Partnerzy technologiczni i dostawcy systemów ligowych

| # | Podmiot | Rola | Możliwość dla FC OS | **FIT** |
|---|---------|------|---------------------|---------|
| 18 | **Droptica** | CMS PZPN, dokumentacja API szyny | Pośrednictwo / integracja partnerska | **8.5** |
| 19 | **Extranet PZPN** | System ligowy (jedyny master) | Connector po umowie | **9.0** |
| 20 | **Systemy typu Sygnal / SportSoft / LigaManager** | Historycznie regionalne | Dane i tak trafiają do Extranet; brak przewagi nad LNP API | **3.0** |
| 21 | **API-Football / Sportmonks / inne globalne** | API międzynarodowe | Brak B klasy DZPN | **1.0** |

---

## 4. Pokrycie klas rozgrywek (Piorun + typowe drużyny klubu)

| Klasa | Oficjalne (Extranet/ŁNP) | DZPN WWW | 90minut | Uwagi |
|-------|--------------------------|----------|---------|-------|
| **B Klasa** (Seniorzy) | ✅ | ⚠️ komunikaty PDF, brak stabilnego Excel | ✅ często | GLKS Mietków — seed FC OS |
| **A Klasa** | ✅ | ⚠️ j.w. | ✅ | |
| **Klasa Okręgowa** | ✅ | ⚠️ j.w. | ✅ częściowo | |
| **4. Liga** | ✅ | ⚠️ | ✅ | |
| **Junior / Trampkarz / Młodzik** | ✅ (Extranet młodzież) | ⚠️ | ⚠️ słabiej | W Extranet osobne rozgrywki |

**Wniosek:** pełne pokrycie wszystkich kategorii ma **wyłącznie ekosystem PZPN**. Agregatory pokrywają głównie seniorów i nie gwarantują kompletności młodzieży.

---

## 5. Scenariusze wdrożenia

### Scenariusz A — Pełna automatyzacja

**Opis:** Cron (np. co 15–60 min) pobiera z `competition-api-pro` tabele, terminarze i wyniki dla zmapowanych `leagueId` / `playId` Pioruna → staging League Hub → sync do modułu Mecze.

**Wymagania:**

- Oficjalne **client credentials** od PZPN lub DZPN (partner SaaS / klub).
- Mapowanie: Piorun Wawrzeńczyce ↔ GLKS Mietków ↔ `teamId` / `clubId` w API.
- Sekret w Vault (Vercel env / Supabase secrets).

**Zaangażowanie człowieka:** 0 (po setupie sezonu).

**Ocena:** jedyny scenariusz spełniający wymaganie w 100% — **pod warunkiem umowy z PZPN**.

---

### Scenariusz B — Półautomatyzacja

**Opis:**

1. Monitor RSS/REST DZPN → wykrycie nowego „Komunikatu rozgrywek” / załącznika PDF.
2. Automatyczne pobranie pliku → parser PDF/XLS → staging.
3. Sync do produkcji; alert tylko przy błędzie parsowania.

**Zaangażowanie człowieka:** ~0–5 min/tydzień (wyjątki).

**Ocena:** realne **bez umowy PZPN**, ale:

- niższa stabilność (format PDF się zmienia),
- opóźnienie vs Extranet (komunikat ≠ live wynik),
- **nie nadaje się na live wyniki w trakcie weekendu** — tylko okresowe tabele.

---

### Scenariusz C — Import wspomagany AI

**Opis:** Skrzynka `liga@import.piorun.pl`, forward z DZPN, zdjęcia tablic wyników, screenshoty mPZPN → LLM/OCR → propozycja importu → auto-apply przy confidence > 95%.

**Zaangażowanie człowieka:** minimalne, ale **nie zero** (edge cases).

**Ocena:** dobry **fallback**, nie strategia główna.

---

### Scenariusz D — Oficjalna integracja (rekomendowany kierunek)

**Opis:**

1. **Kontakt DZPN** (Wrocław: Filip Dębski — rozgrywki senior/junior) + **PZPN** (ds. piłkarstwa amatorskiego).
2. Wniosek: FC OS jako **oprogramowanie klubowe** z dostępem read-only do rozgrywek klubu w API ŁNP.
3. Alternatywa: status **Technology Partner PZPN** (ścieżka Droptica / ISV).
4. Po akceptacji: implementacja adaptera (ETAP 15B.3+) na gotowym League Hub.

**Timeline biznesowy:** 3–12 miesięcy.  
**Timeline techniczny po credentials:** 4–8 tygodni.

---

## 6. Monitorowanie bez łamania regulaminów

| Metoda | Co wykrywa | Legalność | Przydatność |
|--------|------------|-----------|-------------|
| **RSS DZPN** (`/feed/`) | Nowe komunikaty | ✅ Publiczny feed | Trigger — „coś się zmieniło” |
| **WP REST** (`/wp-json/wp/v2/posts`) | Nowe posty, załączniki | ✅ Publiczne API WordPress | Pobranie PDF/XLS jeśli opublikowany |
| **Webhook email** (forward sekretariatu DZPN) | Terminarz w załączniku | ✅ Za zgodą klubu | Półauto |
| **Polling LNP API z credentials** | Wyniki live | ✅ Po umowie | Pełna automatyzacja |
| **Scraping HTML ŁNP / mPZPN** | Tabela/wynik | ❌ Regulamin / 401 | **Nie rekomendowane** |
| **Scraping 90minut** | Wyniki amatorskie | ⚠️ Szara strefa | **Nie rekomendowane** |
| **Hash publicznej strony** | Zmiana layoutu | ✅ | Tylko „strona się zmieniła”, bez danych |

**Rekomendowany monitoring (pre-API):**

```
RSS DZPN → kolejka zadań → pobierz załącznik → parser → League Hub
         ↘ alert jeśli parser fail
```

Po uzyskaniu API — zastąpienie parsera pollingiem LNP.

---

## 7. TOP 5 rozwiązań

### 🥇 1. Oficjalne API Łączy nas piłka (competition-api-pro) + umowa PZPN/DZPN

| | |
|---|---|
| **Plusy** | Pełne dane B/A/okr./junior; ta sama baza co mPZPN; stabilne endpointy (`tables`, `matches`, `plays`); zgodność z regulaminem |
| **Minusy** | Wymaga credentials (401 dziś); proces biznesowy 3–12 mc |
| **Koszt wdrożenia** | 40–80 h technicznych **po** otrzymaniu dostępu + 0–20 h prawnych/biznesowych |
| **Koszt utrzymania** | Niski (monitoring API, rotacja secret) ~2–4 h/miesiąc |
| **Ryzyko** | Niskie (przy umowie); brak umowy = blokada |

---

### 🥈 2. Partnerstwo technologiczne PZPN (szyna NiFi / partner ISV)

| | |
|---|---|
| **Plusy** | Najwyższa jakość danych; możliwość wielu klubów SaaS; przewaga rynkowa FC OS |
| **Minusy** | Najdłuższa ścieżka; wymaga dojrzałości produktu i compliance |
| **Koszt wdrożenia** | Wysoki (3–6 mc projektu integracyjnego) |
| **Koszt utrzymania** | Średni (SLA, wersjonowanie API) |
| **Ryzyko** | Średnie (zależność od PZPN) |

---

### 🥉 3. Extranet — konto klubowe + eksport / dozwolony connector (read-only)

| | |
|---|---|
| **Plusy** | Bezpośredni dostęp do danych „ swojego” klubu; możliwe przed partnerstwem globalnym |
| **Minusy** | Regulamin Extranet może zabronić automatyzacji UI; brak publicznego REST — może wymagać eksportu CSV z UI lub nieudokumentowanego API |
| **Koszt wdrożenia** | 60–120 h (reverse engineering / RPA — **odradzane**) lub 20–40 h (oficjalny export) |
| **Koszt utrzymania** | Średni–wysoki |
| **Ryzyko** | **Wysokie** bez pisemnej zgody PZPN |

---

### 4. Monitor DZPN (RSS/REST) + parser PDF/XLS + AI fallback

| | |
|---|---|
| **Plusy** | Możliwe **natychmiast** bez umowy; legalne źródło (dokumenty publiczne); pasuje do istniejącego `CsvLeagueAdapter` / League Hub |
| **Minusy** | Brak stabilnych terminarzy Excel po redesignie; opóźnienia; błędy OCR; **nie pokrywa live wyników** |
| **Koszt wdrożenia** | 30–50 h |
| **Koszt utrzymania** | 8–16 h/sezon (poprawki parsera) |
| **Ryzyko** | Średnie (jakość danych) |

---

### 5. Model „FC OS push → Extranet” (odwrócona integracja)

| | |
|---|---|
| **Plusy** | Trener wpisuje raz w FC OS; system generuje raport do Extranet; **nie trzeba importować** |
| **Minusy** | **Nadal wymaga pracy trenera** (sprzeczne z wymaganiem); wyniki wpisuje sędzia w Extranet — ryzyko duplikacji/rozbieżności |
| **Koszt wdrożenia** | 50–100 h |
| **Koszt utrzymania** | Średni |
| **Ryzyko** | Konflikt z oficjalnym źródłem (Extranet sędziego) |

**Uwaga:** Scenariusz 5 **nie spełnia** wymagania „zero pracy właściciel/prezes/trener” jeśli chodzi o wyniki meczów wprowadzane przez sędziów — chyba że FC OS **tylko odczytuje** Extranet (wraca do #1).

---

## 8. Czego unikać

| Podejście | Dlaczego |
|-----------|----------|
| Scraping `competition-api-pro` bez auth | 401 + naruszenie ToS + blokada IP |
| Scraping 90minut jako źródło produkcyjne | Nieoficjalne, błędy, ryzyko prawne |
| RPA / bot logujący się do Extranet | Wysokie ryzyko regulaminowe |
| Poleganie na `dzpn.pl/rozgrywki/seniorskie/` | **404** — URL martwy |
| Import ręczny przez właściciela | Sprzeczny z wymaganiem produktowym |

Zgodnie z polityką projektu ([stage-15b-league-hub.md](../modules/stage-15b-league-hub.md)): *„brak scrapera / omijania zabezpieczeń PZPN/DZPN”*.

---

## 9. Rekomendacja architektury dla Piorun Wawrzeńczyce

### Cel

> Football Club OS **sam** aktualizuje tabelę, terminarz i wyniki przy **minimalnym** zaangażowaniu człowieka.

### Rekomendowany plan (3 fazy)

#### Faza 0 — Biznes (tydzie 1–4, równolegle)

1. ~~List intencyjny do **DZPN** (Wrocław) + kopia do **PZPN** (amatorski).~~ ✅ **Wysłany 2026-05-31** — oczekiwanie na odpowiedź.
2. Prośba o:
   - read-only API access dla klubu testowego (GLKS Mietków / B Klasa 2025/26),
   - lub klucz testowy `competition-api-pro` dla FC OS,
   - kontakt do zespołu integracji (Droptica / IT PZPN).
3. Argument: mPZPN już publikuje te dane — FC OS potrzebuje tego samego kanału dla panelu klubu i strony publicznej.

#### Faza 1 — Mostek półautomatyczny (do czasu API, opcjonalnie)

- Monitor **RSS + WP REST DZPN** → auto-pobieranie załączników z komunikatów rozgrywek.
- Parser PDF/XLS → League Hub staging → sync (istniejąca architektura ETAP 15B).
- **Zero kliknięć** dla użytkownika gdy parser OK; alert push do właściciela tylko przy fail.
- Nie zastępuje live wyników — tylko tabela po rundzie.

#### Faza 2 — Pełna automatyzacja (po credentials)

```
┌─────────────────┐     cron 30 min      ┌──────────────────────┐
│ LNP Competition │ ────────────────────▶ │ League Hub staging   │
│ API (auth)      │   tables/matches     │ league_* + sync.ts   │
└─────────────────┘                      └──────────┬───────────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        ▼                             ▼                             ▼
                 matches module              league_table_entries           public /tabela
```

- Nowy adapter: `LnpCompetitionApiAdapter` (ETAP 15B.3 — **poza zakresem tego researchu**).
- Mapowanie ID z `league_teams` (już jest: GLKS Mietków, DZPN-CLUB-4821).
- Sync job w `/league/sync` — już zaimplementowany.

#### Faza 3 — Skala SaaS

- Partnerstwo PZPN → wielokrotne kluby na FC OS z tym samym adapterem.

### Odpowiedź na pytanie kluczowe

**Jak sprawić, by FC OS sam aktualizował dane Pioruna bez pracy właściciela/prezesa/trenera?**

1. **Krótkoterminowo (bez umowy):** tylko **automatyczny monitoring dokumentów publicznych DZPN** + parser — **częściowo** spełnia wymaganie (tabele po komunikatach, nie live).
2. **Docelowo (jedyne pełne rozwiązanie):** **oficjalny dostęp do competition-api-pro** (lub równoważny kanał PZPN) + cron sync w League Hub — **zero pracy ludzi** po jednorazowym mapowaniu sezonu.

**Nie ma legalnej ścieżki „pełnej automatyzacji wyłącznie z publicznych stron WWW”** w obecnym ekosystemie DZPN/PZPN (potwierdzone testami ETAP 15B).

---

## 10. Decyzja produktowa (propozycja)

| Priorytet | Działanie | Owner |
|-----------|-----------|-------|
| P0 | Wniosek do DZPN/PZPN o dostęp API (Scenariusz D) | ✅ **Wysłany 2026-05-31** — oczekiwanie |
| P1 | Specyfikacja `LnpCompetitionApiAdapter` (design only) | Architektura FC OS |
| P2 | Prototyp monitora RSS DZPN (Scenariusz B) — **opcjonalny most** | ETAP 15B.3 |
| P3 | Odrzucić scraping 90minut / nieauth LNP | — |

---

## 11. Załączniki techniczne

### A. Odkryte endpointy LNP (z bundle `230.*.js`)

| Endpoint | Opis |
|----------|------|
| `seasons/dictionaries` | Słownik sezonów |
| `leagues/{leagueId}/seasons/{seasonId}/tables` | Tabela ligowa |
| `leagues/{leagueId}/seasons/{seasonId}/matches` | Terminarz/wyniki |
| `plays/{playId}/tables` | Tabela rozgrywek play-off |
| `plays/{playId}/matches` | Mecze |

Base URL: `https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/`

### B. Probe DZPN (2026-06-01)

| Test | Wynik |
|------|-------|
| `/rozgrywki/seniorskie/` | 404 |
| WP media `.xlsx` | 1 plik (kalkulator) |
| RSS `/feed/` | 200 OK |
| LNP `seasons/dictionaries` | 401 |

### C. Kontakty DZPN (publiczne, strona kontakt)

| Obszar | Kontakt |
|--------|---------|
| Rozgrywki senior/junior Wrocław | filip.debski@dzpn.pl |
| Biuro klubów Wrocław | wroclaw@dzpn.pl |
| Ogólny | dzpn@dzpn.pl |

---

## 12. Wniosek wysłany (follow-up biznesowy)

| Pole | Wartość |
|------|---------|
| **Data wysłania** | 2026-05-31 |
| **Adresaci** | DZPN (Wrocław) + PZPN |
| **Scenariusz** | D — oficjalna integracja (read-only API / równoważny kanał PZPN) |
| **Zakres prośby** | GLKS Mietków, B Klasa sezon 2025/2026 — terminarz, wyniki, tabela ligowa |
| **Cel** | Automatyczna synchronizacja Football Club OS bez ręcznego importu przez właściciela, prezesa ani trenera |
| **Status** | **Oczekiwanie na odpowiedź** |

### Treść wniosku (skrót merytoryczny)

- Prośba o **read-only** dostęp do danych rozgrywkowych (analogicznie do kanału mPZPN / Łączy nas piłka).
- Preferowany kanał techniczny: `competition-api-pro.laczynaspilka.pl` lub równoważne credentials od IT PZPN.
- FC OS: panel klubu + publiczna strona `/tabela` — bez odsprzedaży danych, zgodnie z RODO.
- Klub referencyjny: **Piorun Wawrzeńczyce** (nazwa ligowa **GLKS Mietków**).

### Harmonogram follow-up

| Termin | Działanie |
|--------|-----------|
| **2026-06-14** (~2 tyg.) | Brak odpowiedzi → krótkie przypomnienie (filip.debski@dzpn.pl, dzpn@dzpn.pl, kopia PZPN) |
| **Po odpowiedzi pozytywnej** | ETAP 15B.3 — design + implementacja `LnpCompetitionApiAdapter` |
| **Po odpowiedzi negatywnej / brak API** | ETAP 15B.3 — opcjonalny most RSS/PDF DZPN (Scenariusz B) |
| **Po credentials** | Mapowanie ID ligi/sezonu/klubu, cron sync 30–60 min, staging League Hub |

### Materiały gotowe na callback

- Identyfikatory klubu w Extranet (jeśli znane)
- Opis FC OS i środowisko testowe (staging)
- Architektura League Hub ([stage-15b-league-hub.md](../modules/stage-15b-league-hub.md))
- Endpointy LNP (sekcja 11.A tego raportu)

---

## 13. Następny etap (poza 15B.2)

**ETAP 15B.3** (propozycja): implementacja **dopiero po** decyzji biznesowej — adapter LNP **lub** monitor DZPN, w zależności od odpowiedzi PZPN.

**ETAP 15B.2 = zamknięty** — research i rekomendacja architektury bez kodu. **P0 w toku** — oczekiwanie na DZPN/PZPN.
