# Ekosystem danych PZPN / DZPN — Football Club OS

**Data:** 2026-06-01  
**Status:** dokumentacja referencyjna (bez implementacji integracji)  
**Powiązane:** [ETAP 15B League Hub](../modules/stage-15b-league-hub.md), [ETAP 15B.2 research](../audit/stage-15b2-league-data-research.md) *(nie modyfikować)*

---

## 1. Klub referencyjny FC OS

| Pole | Wartość |
|------|---------|
| **Nazwa w FC OS (branding)** | Piorun Wawrzeńczyce |
| **Nazwa ligowa (Extranet / mPZPN / rozgrywki)** | **GLKS Mietków** |
| **Związek** | Dolnośląski ZPN (DZPN) |
| **Sezon** | **2025/2026** |
| **Rozgrywki** | **B Klasa — Powiat Wrocławski, Grupa VII** |
| **Synonimy w mirrorach** | „Wrocław VII”, `90minut.pl/liga/1/liga14526.html` |

Mapowanie w League Hub: `display_name` = Piorun Wawrzeńczyce, `league_name` = GLKS Mietków, `is_own_club` = true.

---

## 2. Przepływ danych (źródło prawdy → konsumenci)

Oficjalne dane rozgrywkowe (terminarz, wynik, tabela, składy, kartki, strzelcy) powstają w **Extranet PZPN** — wpisywane przez sędziów i kluby (wynik do 15 min po meczu, potem składy i szczegóły).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTRANET PZPN                                     │
│              (sędziowie, trenerzy, biura związków)                       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Szyna danych PZPN (Apache NiFi)                        │
│         źródło: integracja headless CMS — case Droptica / PZPN           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│ competition-api │  │   mPZPN         │  │  laczynaspilka.pl       │
│ -pro (ŁNP API)  │  │  (aplikacja     │  │  (portal WWW + UI       │
│                 │  │   mobilna PZPN) │  │   rozgrywek)            │
└────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘
         │                    │                          │
         │                    └──────────┬───────────────┘
         │                               │
         │         ten sam backend       │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Mirror / agregatory (nieoficjalne, publiczne WWW)           │
│   • 90minut.pl  — deklaruje źródło: mPZPN + laczynaspilka.pl            │
│   • regionalnyfutbol.pl — liga B Wrocław VII 2025/26                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Uwaga: dzpn.pl (strona WWW) ≠ mPZPN

Strona **dzpn.pl** publikuje komunikaty, regulaminy i dokumenty — **nie** udostępnia stabilnego publicznego API ani plików CSV/XLSX z live tabelą B Klasy. Prezes DZPN wskazuje klubom **mPZPN** jako miejsce śledzenia terminarza lokalnej drużyny.

---

## 3. mPZPN — „aplikacja DZPN” w praktyce

| | |
|---|---|
| **Nazwa** | mPZPN |
| **Wydawca** | Polski Związek Piłki Nożnej |
| **Pakiet** | `com.pzpn.lnp` (Google Play), App Store ID `6499554377` |
| **Zakres** | Wszystkie ligi PZPN i WZPN — od Ekstraklasy po B/A/okręgówkę i młodzież |
| **Dane** | Terminarze, wyniki na żywo, tabele, składy, kartki, statystyki zawodników |
| **Backend** | Ten sam co **Łączy Nas Piłka** / `competition-api-pro` |

DZPN nie utrzymuje osobnej aplikacji z własnym API — dane dolnośląskie trafiają do ekosystemu PZPN i są widoczne w mPZPN po wybraniu ligi klubu.

---

## 4. API — competition-api-pro (ŁNP)

### Base URL

```
https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/
```

### Odkryte endpointy (z bundle frontendu laczynaspilka.pl, probe ETAP 15B)

| Metoda / ścieżka | Opis |
|------------------|------|
| `GET seasons/dictionaries` | Słownik sezonów i lig |
| `GET leagues/{leagueId}/seasons/{seasonId}/tables` | Tabela ligowa |
| `GET leagues/{leagueId}/seasons/{seasonId}/matches` | Terminarz i wyniki |
| `GET plays/{playId}/tables` | Tabela fazy play-off / rozgrywek |
| `GET plays/{playId}/matches` | Mecze fazy play-off |

Inne hosty w bundle (domain-settings, profile, youth): `bus20-api-lnp2.laczynaspilka.pl`, `profil-api-prod.laczynaspilka.pl` — osobne domeny produktowe ŁNP, nie zastępują competition-api dla tabel/meczów.

### Status dostępu (probe 2026-06-01)

| Test | Wynik |
|------|--------|
| `GET .../seasons/dictionaries` | **401 Unauthorized** |
| `GET .../` (root v1) | **404** |
| Publiczny dostęp bez credentials | **Brak** |

**Wniosek:** API istnieje i zasila mPZPN, ale **nie jest publicznie otwarte** dla ISV/klubów bez umowy z PZPN/DZPN.

---

## 5. Mirror publiczne (dev / weryfikacja — nie kanał produkcyjny FC OS)

| Źródło | URL (liga referencyjna) | Uwagi |
|--------|-------------------------|--------|
| **90minut.pl** | http://www.90minut.pl/liga/1/liga14526.html | B Klasa 2025/26, grupa Wrocław VII; źródło: mPZPN + ŁNP |
| **regionalnyfutbol.pl** | [tabela-terminarz Wrocław VII](https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html) | 12 drużyn, pełny terminarz |
| **dzpn.pl** | https://dzpn.pl/ | Brak live API ligowego; RSS/komunikaty only |

Agregatory mogą służyć **wyłącznie** do testów i weryfikacji danych — produkcyjna automatyzacja FC OS powinna iść przez **oficjalne API** po credentials.

---

## 6. Kontakty

### DZPN (Dolnośląski ZPN)

| Obszar | Kontakt |
|--------|---------|
| Rozgrywki senior/junior Wrocław | filip.debski@dzpn.pl |
| Biuro klubów Wrocław | wroclaw@dzpn.pl |
| Ogólny | dzpn@dzpn.pl |
| WWW | https://dzpn.pl/ |

### PZPN (Polski ZPN)

| Obszar | Kontakt / kanał |
|--------|-----------------|
| Piłkarstwo amatorskie | https://pzpn.pl/ — sekcja federacja / amatorski |
| mPZPN (info produktowe) | https://pzpn.pl/federacja/aktualnosci/2024-05-31/mpzpn-wyniki-wszystkich-rozgrywek-w-twoim-telefonie |
| Integracja IT / partnerstwo | przez wniosek formalny (DZPN → PZPN IT / partner Droptica) |
| Extranet | https://extranet.pzpn.pl/ (wymaga konta klubowego) |

**Status FC OS (2026-05-31):** wniosek o read-only API wysłany do DZPN + PZPN — oczekiwanie na odpowiedź. Szczegóły procesu biznesowego: sekcja 12 w [stage-15b2-league-data-research.md](../audit/stage-15b2-league-data-research.md) *(tylko odczyt)*.

---

## 7. Rekomendowana ścieżka integracji FC OS

### Docelowo (pełna automatyzacja, zero pracy trenera/prezesa)

1. **Uzyskać credentials** do `competition-api-pro` (lub równoważny kanał PZPN) — read-only dla:
   - B Klasa, Powiat Wrocławski, **Grupa VII**, sezon **2025/2026**
   - klub **GLKS Mietków** (Piorun Wawrzeńczyce)
2. **Zmapować ID** w League Hub: `leagueId`, `seasonId`, `clubId` Extranet → rekordy `league_competitions` / `league_teams`.
3. **Adapter** (poza zakresem tego dokumentu): `LnpCompetitionApiAdapter` → istniejący staging League Hub → cron sync co 30–60 min.
4. **Sync** do modułu Mecze + publiczna `/tabela` — bez scrapera i bez omijania auth.

```
credentials PZPN
       │
       ▼
competition-api-pro  ──cron──▶  League Hub staging  ──sync──▶  Mecze + /tabela
```

### Mostek tymczasowy (do czasu API)

| Opcja | Dozwolone w FC OS | Uwagi |
|-------|-------------------|--------|
| Import CSV/JSON ręczny lub skrypt dev | ✅ | `fixtures/league/live/`, `npm run import:league-fixture` |
| Monitor RSS dzpn.pl (komunikaty) | ⚠️ opcjonalnie | Trigger PDF, nie live wyniki |
| Scraping 90minut / regionalnyfutbol | ❌ produkcja | Tylko dev/test; ToS i niestabilność |
| Scraping competition-api bez auth | ❌ | 401 + polityka projektu |

### Czego unikać

- Poleganie na `dzpn.pl/rozgrywki/seniorskie/` (**404**).
- Traktowanie mirrorów jako źródła prawdy w produkcji.
- RPA / bot na Extranet bez zgody PZPN.

---

## 8. Snapshot referencyjny (Grupa VII, sezon 2025/2026)

Stan mirrorów na **2026-06-01** (po rundzie wiosennej, przed końcówką sezonu):

| Poz. | Drużyna | M | Pkt | W-R-P | Bramki |
|------|---------|---|-----|-------|--------|
| 1 | MKS Magnice | 20 | 47 | 14-5-1 | 69:32 |
| … | … | … | … | … | … |
| **11** | **GLKS Mietków** | **20** | **14** | **4-2-14** | **24:63** |
| 12 | Wicher Domasław* | 20 | 9 | 2-3-15 | 23:58 |

\* Wicher Domasław wycofał się po rundzie jesiennej.

Dane seed League Hub i pliki w `fixtures/league/live/` odzwierciedlają tę ligę — patrz migracja `20260618121000_seed_stage15b_league.sql`.

---

## 9. Słownik skrótów

| Skrót | Znaczenie |
|-------|-----------|
| **DZPN** | Dolnośląski Związek Piłki Nożnej |
| **PZPN** | Polski Związek Piłki Nożnej |
| **ŁNP** | Łączy Nas Piłka (portal + API) |
| **mPZPN** | Oficjalna aplikacja mobilna PZPN |
| **Extranet** | System klubowo-sędziowski PZPN |
| **FC OS** | Football Club OS (ten projekt) |
