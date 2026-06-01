# ETAP 15B.2A — Dostęp prezesa klubu: kluby24 / Extranet / mPZPN

**Data:** 2026-06-01  
**Status:** RESEARCH ONLY — raport architektury, **bez implementacji**  
**Zakres:** analiza możliwości integracji wynikających z **legalnego** dostępu prezesa (Administrator Klubu)  
**Klub referencyjny FC OS:** Piorun Wawrzeńczyce / **GLKS Mietków**, DZPN, B Klasa Grupa VII 2025/2026  

**Metoda:** synteza dokumentacji FC OS (ETAP 15B.2), publicznych instrukcji WZPN/OZPN/PZPN, case study Droptica, obserwacja architektury logowania (OAuth2/Keycloak) — **bez logowania, bez probe’ów sieciowych, bez scrapingu**.

Powiązane: [stage-15b2-league-data-research.md](./stage-15b2-league-data-research.md), [pzpn-data-ecosystem.md](../research/pzpn-data-ecosystem.md), [stage-15b-league-hub.md](../modules/stage-15b-league-hub.md).

---

## 1. Executive summary

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy prezes może **legalnie** pobrać tabelę/terminarz jako CSV/XLSX z kluby24? | **Nie udokumentowane** — oficjalne instrukcje klubowe opisują operacje procesowe (transfery, uprawnienia, protokoły), nie eksport masowy rozgrywek. |
| Czy prezes ma dostęp do REST/GraphQL dla FC OS? | **Nie** — brak publicznej dokumentacji API klubowego; UI to aplikacja webowa (SPA) z auth Keycloak. |
| Skąd biorą się wyniki widoczne w mPZPN? | **competition-api-pro** (ŁNP) — ten sam backend co laczynaspilka.pl, **nie** bezpośrednio z kluby24 UI. |
| Czy legalny dostęp prezesa wystarczy do automatyzacji FC OS? | **Nie w pełni** — dostęp klubowy służy **obsłudze procesów** (wpisy, protokoły); **odczyt live** idzie przez kanał ŁNP/mPZPN, który wymaga **credentials od PZPN** (wniosek wysłany 2026-05-31). |
| Rekomendacja FC OS | **Scenariusz D** (read-only `competition-api-pro`) + ewentualnie ręczny PDF protokołu jako audyt; **nie** RPA na kluby24, **nie** reverse-engineering JWT klubu. |

---

## 2. Mapa systemów (perspektywa prezesa)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PREZES / ADMINISTRATOR KLUBU (konto PZPN24 → uprawnienia klubowe)            │
└───────────────┬───────────────────────────────┬───────────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────────────────┐
│  kluby24.pzpn.pl          │     │  mPZPN (iOS / Android)                     │
│  Extranet — panel klubu   │     │  aplikacja mobilna PZPN                    │
│  OAuth: login.laczynaspilka.pl │     │  odczyt rozgrywek, powiadomienia       │
│  client: KLUBY_BACKEND    │     │  konto opcjonalne (ulubione drużyny)       │
└─────────────┬─────────────┘     └───────────────────┬───────────────────────┘
              │ ZAPIS / procesy                        │ ODCZYT
              │ (protokoły, składy, transfery)         │
              ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXTRANET PZPN (master) — sędziowie + kluby + biura związków                 │
│  wynik meczu, skład, kary, terminy ustalane przez kluby                      │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Szyna danych PZPN (Apache NiFi) + headless CMS (Drupal / Droptica)          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│ competition-api │  │ laczynaspilka.pl│  │ CMS / treści redakcyjne │
│ -pro (ŁNP)      │  │ (frontend WWW)  │  │                         │
└────────┬────────┘  └─────────────────┘  └─────────────────────────┘
         │
         └──▶ mPZPN, widgety tabel, strony rozgrywek (odczyt publiczny po publikacji)
```

**Kluczowa różnica:** kluby24 to **front operacyjny klubu** (write + pobieranie dokumentów procesowych). mPZPN/ŁNP to **front publikacyjny rozgrywek** (read). FC OS potrzebuje kanału **read** — architektonicznie bliżej **competition-api-pro** niż kluby24.

---

## 3. kluby24.pzpn.pl (Extranet dla klubów)

### 3.1 Rola i dostęp

| Element | Opis |
|---------|------|
| **URL** | https://kluby24.pzpn.pl |
| **Poprzednik** | extranet.pzpn.pl (operacje klubowe przeniesione od 02/2021) |
| **Konto** | Wniosek przez https://pzpn24.pzpn.pl → rola Administrator Klubu (max 2/k lubb) lub Pracownik Klubu (nadawane przez admina) |
| **Logowanie** | SSO Keycloak PZPN — `login.laczynaspilka.pl`, realm `PZPN`, klient OAuth `KLUBY_BACKEND` (publicznie widoczny w URL przekierowania) |
| **Uprawnienia prezesa** | Pełny administrator klubu: transfery, uprawnienia zawodników, terminy, protokoły, dane klubu |

Źródła publiczne: instrukcje LZPN, ZZPN, NSOZPN, OZPN Siedlce (lista funkcji modułu klubowego).

### 3.2 Eksporty (CSV / XLSX / PDF)

| Format | Terminarz / tabela ligowa | Protokoły / dokumenty klubowe | Werdykt dla FC OS |
|--------|---------------------------|-------------------------------|-------------------|
| **CSV** | ❌ Brak w oficjalnych instrukcjach klubowych | ❌ Nie opisany | Brak legalnego kanału masowego importu |
| **XLSX** | ❌ j.w. | ❌ j.w. | j.w. |
| **PDF** | ❌ j.w. (tabela w UI, nie plik) | ✅ **Protokół meczowy** — „pobierz protokół” (instrukcje LZPN, zakładka Rozgrywki → Lista rozgrywek) | Tylko **pojedynczy mecz**, parser PDF możliwy **po zgodzie PZPN** — nie skalowalne na całą ligę |

**Wniosek:** legalny dostęp prezesa daje **PDF protokołu** i **widok ekranowy** terminarza/tabeli w UI — **nie** udokumentowany eksport strukturalny całej ligi do CSV/XLSX.

### 3.3 Endpointy (REST / GraphQL / JSON feeds)

| Typ | Status | Uwagi |
|-----|--------|-------|
| **REST publiczny** | ❌ Brak dokumentacji | SPA komunikuje się z backendem klubowym po OAuth2 — endpointy **niepubliczne**, specyfikacja wyłącznie wewnętrzna PZPN |
| **GraphQL** | ❌ Brak publicznych śladów | — |
| **JSON feeds** | ❌ Brak | — |
| **OAuth2 / OpenID Connect** | ✅ | Token sesji użytkownika klubu — **nie** do przekazania FC OS (ToS, RODO, brak delegacji) |

**Wniosek:** reverse-engineering API kluby24 z tokenem prezesa = **wysokie ryzyko regulaminowe** (por. ETAP 15B.2 — odradzane RPA/boty).

### 3.4 Backend panelu klubowego

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy kluby24 korzysta z **competition-api-pro**? | **Pośrednio** — dane rozgrywkowe **docierają** do ekosystemu ŁNP po zapisie w Extranet/NiFi; UI kluby24 to **osobny front** (Kluby Backend), nie bezpośrednie wywołania `competition-api-pro` widoczne w publicznych materiałach |
| Inne API | Keycloak (`login.laczynaspilka.pl`), prawdopodobnie dedykowane mikroserwisy klubowe (transfery, ewidencja) — **poza zakresem legalnej integracji bez umowy** |

### 3.5 Webhooki, partnerstwa, dokumentacja

| Element | Status |
|---------|--------|
| **Webhooki wychodzące** | ❌ Nie udokumentowane dla klubów |
| **Integracje partnerskie (ISV)** | ⚠️ Wyłącznie ścieżka formalna PZPN / Droptica (case study headless CMS) |
| **Dokumentacja API dla klubów** | ❌ Brak publicznej — wyłącznie PDF „Instrukcja obsługi aplikacji klubowej” (operacje UI) |

---

## 4. Extranet PZPN (system master)

Extranet to **umbrella** — obejmuje m.in. kluby24 (kluby), moduły sędziowskie, biura związków. **Źródło prawdy** dla wyników, składów, kartek, dyscypliny.

### 4.1 Eksporty dostępne prezesowi (przez kluby24)

| Dane | Eksport masowy | Dostęp w UI | Uwagi |
|------|----------------|-------------|-------|
| Terminarz rozgrywek | ❌ CSV/XLSX | ✅ lista meczów | Ustalanie terminów przez klub (funkcja opisana publicznie) |
| Tabela ligowa | ❌ CSV/XLSX | ✅ podgląd | Po publikacji przez system |
| Wyniki meczów | ❌ CSV/XLSX | ✅ | Wprowadzane przez sędziego; klub uzupełnia protokół |
| Składy / kadra | ❌ CSV (bulk) | ✅ formularze | Ewidencja zawodników, nie export ligowy |
| Protokół meczowy | — | ✅ **PDF** | Jedyny potwierdzony format pliku do pobrania |
| Kary dyscyplinarne | ❌ | ✅ podgląd | — |

### 4.2 Endpointy

| Kanał | Opis |
|-------|------|
| **Extranet → NiFi** | Wewnętrzna szyna (Droptica) — **brak dostępu klubowego** |
| **Extranet REST dla ISV** | ❌ Brak publicznej specyfikacji; connector wymaga **umowy z PZPN** |
| **GraphQL / JSON feed** | ❌ |

### 4.3 Webhooki i partnerstwa

| Element | Opis |
|---------|------|
| **Webhooki** | ❌ Brak informacji o webhookach dla klubów zewnętrznych |
| **Partnerzy technologiczni** | Droptica (CMS + dokumentacja API **wewnętrzna** PZPN), ewentualni integratorzy po umowie |
| **Dokumentacja** | Instrukcje PDF WZPN/OZPN; architektura opublikowana na poziomie case study (NiFi, headless), **nie** openapi klubowy |

### 4.4 Implikacja dla FC OS

Model **„FC OS czyta Extranet”** legalnie możliwy tylko jako:

1. **Oficjalny connector** (read-only) od IT PZPN — preferowany.
2. **Ręczny PDF protokołu** — uzupełnienie audytu pojedynczego meczu, nie sync ligi.
3. ~~Bot na koncie prezesa~~ — **odrzucone** (regulamin, RODO, utrzymanie).

---

## 5. mPZPN (aplikacja mobilna)

### 5.1 Rola

| Element | Wartość |
|---------|---------|
| **Pakiet** | `com.pzpn.lnp` (Google Play), App Store ID `6499554377` |
| **Wydawca** | PZPN |
| **Zakres** | Wszystkie ligi PZPN — od Ekstraklasy po B/A/okręgówkę |
| **Dane** | Terminarze, wyniki live, tabele, składy, statystyki, archiwum sezonów |
| **Konto użytkownika** | Opcjonalne (ulubione drużyny, powiadomienia, kalendarz iOS) |

Prezes **nie potrzebuje** konta klubowego — mPZPN pokazuje **te same opublikowane** dane co ŁNP dla dowolnej ligi.

### 5.2 Eksporty

| Format | Dostępność |
|--------|------------|
| **CSV / XLSX / PDF** | ❌ Brak funkcji eksportu w aplikacji (udostępnianie ekranu / kalendarz iOS to nie dane strukturalne) |

### 5.3 Endpointy

| Typ | Status |
|-----|--------|
| **REST (competition-api-pro)** | ✅ Backend aplikacji — te same endpointy co laczynaspilka.pl (`seasons/dictionaries`, `leagues/.../tables`, `.../matches`, `plays/...`) |
| **Auth** | Token aplikacji mobilnej / użytkownika — **zamknięty**, probe ETAP 15B: anonimowy dostęp → **401** |
| **GraphQL** | ❌ Brak publicznego |
| **JSON feeds** | ❌ |

Hosty powiązane (z bundle ŁNP, ETAP 15B): `competition-api-pro.laczynaspilka.pl`, `bus20-api-lnp2.laczynaspilka.pl`, `profil-api-prod.laczynaspilka.pl` — osobne produkty (profil, młodzież), nie zastępują competition-api dla tabel/meczów.

### 5.4 Webhooki, partnerstwa, dokumentacja

| Element | Status |
|---------|--------|
| **Webhooki** | ❌ |
| **API dla ISV** | ❌ — aplikacja konsumencka PZPN |
| **Dokumentacja** | App Store / polityka prywatności; brak openapi dla developerów |

---

## 6. competition-api-pro — relacja do trzech kanałów

| Kanał prezesa | Relacja do competition-api-pro |
|---------------|-------------------------------|
| **kluby24** | **Upstream (write)** — klub wpisuje/uzupełnia dane → Extranet → NiFi → **dopiero potem** API |
| **Extranet** | **Master** — nie wystawia publicznego REST klubom |
| **mPZPN** | **Downstream (read)** — bezpośredni klient API (z auth) |

**Base URL (odkryty w ETAP 15B, bundle frontendu):**

```
https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/
```

| Endpoint | Zastosowanie FC OS |
|----------|-------------------|
| `GET seasons/dictionaries` | Mapowanie sezonu/ligi |
| `GET leagues/{id}/seasons/{id}/tables` | Tabela → `league_tables` |
| `GET leagues/{id}/seasons/{id}/matches` | Terminarz/wyniki → `league_fixtures` |
| `GET plays/{playId}/tables` | Fazy play-off |
| `GET plays/{playId}/matches` | Mecze play-off |

**Dostęp prezesa klubu NIE równa się dostępowi API** — credentials wymagają **osobnej decyzji PZPN** (wniosek FC OS 2026-05-31).

---

## 7. Macierz odpowiedzi (checklist ETAP 15B.2A)

### 7.1 Eksporty

| System | CSV | XLSX | PDF | Uwagi |
|--------|-----|------|-----|-------|
| kluby24 | ❌ | ❌ | ✅ protokół meczowy | Brak bulk export rozgrywek w instrukcjach |
| Extranet (via kluby24) | ❌ | ❌ | ✅ protokół | Master — reszta w UI |
| mPZPN | ❌ | ❌ | ❌ | Tylko UI + opcjonalnie kalendarz OS |

### 7.2 Endpointy

| System | REST | GraphQL | JSON feeds |
|--------|------|---------|------------|
| kluby24 | ⚠️ wewnętrzny (OAuth) | ❌ | ❌ |
| Extranet / NiFi | ⚠️ partnerski (Droptica) | ❌ | ❌ |
| mPZPN → competition-api-pro | ✅ (z auth PZPN) | ❌ | ❌ |
| Publiczny anonimowy dostęp | ❌ **401** | ❌ | ❌ |

### 7.3 Backend panelu

| System | competition-api-pro | Inne API |
|--------|---------------------|----------|
| kluby24 UI | Pośrednio (pipeline Extranet) | Kluby Backend + Keycloak |
| mPZPN | **Bezpośrednio (read)** | Profil, powiadomienia push |
| laczynaspilka.pl WWW | **Bezpośrednio (read)** | CMS, redakcja |

### 7.4 Webhooki, partnerstwa, dokumentacja

| Element | kluby24 / Extranet | mPZPN / ŁNP |
|---------|-------------------|-------------|
| Webhooki dla klubów | ❌ | ❌ |
| Integracje partnerskie | ✅ Droptica / umowa PZPN | ✅ ten sam ekosystem |
| Dokumentacja API publiczna | ❌ (PDF instrukcje UI) | ❌ (401 bez credentials) |
| Ścieżka FC OS | Wniosek read-only API | Ten sam adapter `LnpCompetitionApiAdapter` |

---

## 8. Scenariusze integracji FC OS (tylko legalny dostęp prezesa)

| # | Scenariusz | Automatyzacja | Legalność | Rekomendacja |
|---|------------|---------------|-----------|--------------|
| **A** | Credentials **competition-api-pro** (read-only) od PZPN | ✅ pełna | ✅ przy umowie | **Docelowy** — wniosek w toku |
| **B** | Prezes ręcznie pobiera **PDF protokołu** → parser FC OS | ⚠️ per mecz | ✅ treść klubu | Uzupełnienie / audyt, nie sync ligi |
| **C** | Prezes eksportuje dane z kluby24 | ❌ brak eksportu | — | **Niewykonalne** dziś |
| **D** | FC OS loguje się jako prezes (RPA / token reuse) | ⚠️ technicznie możliwe | ❌ regulamin | **Odrzucone** |
| **E** | mPZPN / ŁNP scraping | ⚠️ | ❌ ToS + 401 | **Odrzucone** |
| **F** | Partnerstwo ISV (Droptica / NiFi) | ✅ pełna | ✅ | Długa ścieżka SaaS |

---

## 9. Weryfikacja manualna (checklist dla prezesa klubu)

Do potwierdzenia **przez prezesa** w sesji przeglądarki (bez automatyzacji FC OS):

1. Zaloguj się na https://kluby24.pzpn.pl (konto Administrator Klubu).
2. **Rozgrywki → Lista rozgrywek** — czy widoczny przycisk „Eksport CSV/XLSX” lub „Pobierz terminarz”? *(oczekiwane: brak)*
3. Otwórz mecz klubu — czy dostępny **PDF protokołu**? *(oczekiwane: tak)*
4. Sprawdź tabelę ligi w UI — czy identyczna z mPZPN dla GLKS Mietków / Grupa VII?
5. W mPZPN — wyszukaj ligę B Klasa Wrocław VII — porównaj pozycję i punkty z FC OS `/tabela`.
6. Jeśli DZPN/PZPN odpowie na wniosek — zapytaj wprost: *„Czy FC OS może otrzymać read-only client credentials do competition-api-pro dla klubu GLKS Mietków?”*

Wyniki checklisty warto dopisać do sekcji 12 w [stage-15b2-league-data-research.md](./stage-15b2-league-data-research.md) po wykonaniu przez prezesa.

---

## 10. Architektura docelowa FC OS (bez zmian względem 15B.2)

```
                    ┌─────────────────────────┐
                    │  Wniosek PZPN (w toku)   │
                    │  read-only credentials   │
                    └────────────┬────────────┘
                                 │
Prezes (kluby24) ──write──▶ Extranet ──NiFi──▶ competition-api-pro
                                 │                      │
                                 │                      │ cron (po auth)
                                 │                      ▼
                                 │            ┌──────────────────┐
Prezes (mPZPN) ───read UI───────┘            │ League Hub FC OS │
                                             │ staging → sync   │
                                             └────────┬─────────┘
                                                      ▼
                                            Mecze + /tabela publiczna
```

**Nie implementować** w ETAP 15B.2A: adapterów, cronów, parserów kluby24, scraperów mPZPN.

---

## 11. Decyzje produktowe

| Priorytet | Działanie | Status |
|-----------|-----------|--------|
| P0 | Odpowiedź PZPN/DZPN na wniosek API | Oczekiwanie (2026-05-31) |
| P1 | Checklist manualny prezesa (sekcja 9) | Do wykonania przez klub |
| P2 | Design `LnpCompetitionApiAdapter` (spec only) | ETAP 15B.3 |
| P3 | Parser PDF protokołu (opcjonalny) | Tylko po potwierdzeniu zgodności z PZPN |

---

## 12. Źródła (publiczne)

| Źródło | URL / odniesienie |
|--------|-------------------|
| LZPN — Extranet dla Klubów | https://lzpn.org/content/extranet-dla-klubow/ |
| ZZPN — kluby24, uprawnienia | https://zzpn.pl/aktualnosci-zzpn/861-kluby-extranet-zmiana-sposobu-uzyskiwania-uprawnie%C5%84-do-klub%C3%B3w |
| NSOZPN — kluby24 vs pzpn24 | https://nsozpn.pl/aktualna-wersja-etranetu-dla-klubow-kluby24-pzpn-pl/ |
| Droptica — architektura NiFi/CMS | https://www.droptica.pl/case-study/headless-cms-dla-pzpn/ |
| mPZPN — App Store | https://apps.apple.com/app/mpzpn/id6499554377 |
| FC OS — probe LNP (401) | [stage-15b2-league-data-research.md](./stage-15b2-league-data-research.md) §11 |
| FC OS — ekosystem | [pzpn-data-ecosystem.md](../research/pzpn-data-ecosystem.md) |

---

**ETAP 15B.2A = zamknięty** — raport architektury możliwości integracji z legalnego dostępu prezesa. **Implementacja dopiero po decyzji PZPN (15B.3).**
