# ETAP 13.6 — pomiar rzeczywistych czasów (Football Club OS)

**Data pomiaru:** 2026-06-01  
**Środowisko:** `next start` na `http://localhost:3001` (build produkcyjny)  
**Klub testowy:** Piorun Wawrzeńczyce (`a1b2c3d4-e5f6-7890-abcd-ef1234567890`)  
**Użytkownik:** `wlasciciel@piorun.test`  
**Próby:** 5 na trasę (średnia)  
**Status:** ✅ pomiar zakończony — **bez optymalizacji, bez nowych funkcji**

Surowe dane: [`stage-13.6-measurements.json`](./stage-13.6-measurements.json)  
Powtórzenie: `npm run build && npx next start -p 3001` → `MEASURE_BASE_URL=http://localhost:3001 npm run measure:stage136`

---

## Metodologia

| Metryka | Źródło | Opis |
|---------|--------|------|
| **TTFB** | HTTP GET (`node:http`) | Czas do pierwszego bajtu odpowiedzi HTML/RSC |
| **SSR time** | ≈ TTFB | Brak osobnego hooka w RSC — TTFB traktowany jako czas renderu serwerowego |
| **DB time** | Bezpośrednie zapytania `pg` (pooler Supabase) | Symulacja loaderów RSC — **suma sekwencyjna** zapytań layout + page |
| **Liczba zapytań** | Profil SQL | Layout (6) + zapytania specyficzne dla strony |
| **Transfer danych** | Rozmiar body HTTP | HTML/RSC w KB; osobno `dbTransferKb` z profilu SQL |

**Uwaga:** W aplikacji zapytania layoutu i strony często idą **równolegle** (`Promise.all`). Gdy `DB time > TTFB`, baza nie blokuje sekwencyjnie — TTFB odzwierciedla równoległość, a profil DB pokazuje górne ograniczenie kosztu Supabase.

**Dekompozycja opóźnień (model szacunkowy):**

- **Supabase** — czas z profilu DB (`dbMs`)
- **Next.js + React** — reszta TTFB po odjęciu DB i middleware: `max(0, TTFB − DB − 15 ms)`
- **Middleware** — stałe ~15 ms (weryfikacja JWT)
- **Sieć** — ~2% TTFB (localhost → minimalny overhead)
- **PWA** — osobno `/api/pwa/offline-data` (nie blokuje TTFB stron; defer 2,5 s w kliencie)
- **OpenAI** — **0 ms** przy ładowaniu wszystkich mierzonych ekranów (brak wywołań API na SSR)

---

## Widoki główne (8 + login)

### Login

| Metryka | Strona `/login` | Supabase Auth API |
|---------|-----------------|-------------------|
| TTFB | **25,4 ms** | **160,4 ms** |
| SSR ~ | 25,4 ms | — |
| DB time | 0 ms | — |
| Zapytania SQL | 0 | — |
| Transfer | 14,9 KB | 1,9 KB |

Logowanie użytkownika = statyczna powłoka RSC + POST do Supabase Auth (`/auth/v1/token`). Opóźnienie UX logowania dominuje **Supabase Auth (~160 ms)**, nie Next.js.

---

### Dashboard, mecze, treningi, zawodnicy, sponsorzy, finanse, AI manager

| Widok | TTFB | SSR ~ | DB time | Zapyt. | Transfer HTML | Transfer DB |
|-------|------|-------|---------|--------|---------------|-------------|
| **Dashboard** | 588,8 ms | 588,8 ms | 435 ms | 9 | 103,0 KB | 2,0 KB |
| **Mecze** | 300,4 ms | 300,4 ms | 391,4 ms | 8 | 59,4 KB | 2,1 KB |
| **Treningi** | 263,1 ms | 263,1 ms | 441,8 ms | 9 | 68,5 KB | 9,3 KB |
| **Zawodnicy** | 331,1 ms | 331,1 ms | 339,5 ms | 7 | **142,2 KB** | 8,0 KB |
| **Sponsorzy** | 434,2 ms | 434,2 ms | **529,4 ms** | **11** | 69,7 KB | 4,7 KB |
| **Finanse** | 428,2 ms | 428,2 ms | 292,6 ms | 11 | 63,4 KB | 1,2 KB |
| **AI manager** | 348,4 ms | 348,4 ms | 386,7 ms | 8 | 61,3 KB | 1,2 KB |

**Średnia TTFB (7 widoków chronionych):** 384,9 ms  
**Najwolniejszy widok główny:** Dashboard (588,8 ms TTFB)  
**Największy transfer HTML:** Zawodnicy (142,2 KB)  
**Najwięcej zapytań SQL:** Sponsorzy / Finanse (11)  
**Najdłuższy profil DB (sekwencyjnie):** Sponsorzy (529,4 ms)

---

## Profil zapytań SQL (layout + strona)

### Layout wspólny (6 zapytań, 292,6 ms, ~0,6 KB)

| Zapytanie | Czas | Wiersze |
|-----------|------|---------|
| `profiles` | 49,6 ms | 1 |
| `club_memberships` | 48,6 ms | 1 |
| `clubs` | 47,0 ms | 1 |
| `teams` | 48,7 ms | 1 |
| `club_notifications_count` | 49,6 ms | 1 |
| `website_settings` | 49,1 ms | 1 |

Każde zapytanie layoutu ~**47–50 ms** (latency poolera Supabase).

### Zapytania specyficzne per strona (bez layoutu)

| Strona | Zapyt. page | DB page | Największy payload |
|--------|-------------|---------|-------------------|
| Dashboard | 3 | 142,4 ms | alerty dokumentów |
| Mecze | 2 | 98,8 ms | kalendarz meczów |
| Treningi | 3 | 149,2 ms | **8,4 KB** (kalendarz) |
| Zawodnicy | 1 | 46,9 ms | **7,0 KB** (lista) |
| Sponsorzy | 5 | 236,8 ms | kontrakty + agregaty |
| Finanse | 5 | **0 ms** ⚠ | tabele `finance_*` **brak w DB testowej** |
| AI manager | 2 | 94,1 ms | pamięć + approvals |

---

## PWA

| Endpoint | TTFB | Transfer | DB (profil) | Zapyt. |
|----------|------|----------|-------------|--------|
| `/api/pwa/offline-data` | **383,2 ms** | 4,9 KB | 486 ms (10 zapytań) | 4 page + 6 layout |

PWA API jest **5. najwolniejszym** ekranem/end-pointem w rankingu. Na stronach chronionych fetch PWA jest **odroczony o 2,5 s** (ETAP 13.5) — nie wpływa na TTFB HTML.

---

## TOP 20 najwolniejszych ekranów (TTFB)

| # | Ekran | TTFB | Transfer | Kategoria |
|---|-------|------|----------|-----------|
| 1 | `/notifications` | **769,4 ms** | 53,4 KB | extra |
| 2 | `/dashboard` | 588,8 ms | 103,0 KB | **core** |
| 3 | `/sponsors` | 434,2 ms | 69,7 KB | **core** |
| 4 | `/finance` | 428,2 ms | 63,4 KB | **core** |
| 5 | `/api/pwa/offline-data` | 383,2 ms | 4,9 KB | pwa |
| 6 | `/ai/manager` | 348,4 ms | 61,3 KB | **core** |
| 7 | `/matches/league-table` | 344,5 ms | 63,3 KB | extra |
| 8 | `/players` | 331,1 ms | 142,2 KB | **core** |
| 9 | `/settings` | 319,5 ms | 53,4 KB | extra |
| 10 | `/matches` | 300,4 ms | 59,4 KB | **core** |
| 11 | `/training` | 263,1 ms | 68,5 KB | **core** |
| 12 | `/ai/reports` | 260,5 ms | 59,4 KB | extra |
| 13 | `/ai/chat` | 260,2 ms | 48,2 KB | extra |
| 14 | `/training/ranking` | 259,4 ms | 61,2 KB | extra |
| 15 | `/players/new` | 244,6 ms | 66,1 KB | extra |
| 16 | `/` (strona klubu) | 218,6 ms | 49,3 KB | public |
| 17 | Supabase auth (login API) | 160,4 ms | 1,9 KB | auth |
| 18 | `/aktualnosci` | 147,9 ms | 31,1 KB | public |
| 19 | `/login` | 25,4 ms | 14,9 KB | **core** |
| 20 | — | — | — | *(tylko 19 unikalnych tras w pomiarze)* |

W zbiorze pomiarowym jest **19 tras** — pełne TOP 20 wymagałoby dodatkowych ekranów w kolejnym przebiegu.

---

## Skąd pochodzą opóźnienia

### Widoki główne — budżet TTFB (model skryptu)

| Widok | Supabase (DB profil) | Next.js + React | Middleware | Sieć | OpenAI | PWA |
|-------|----------------------|-----------------|------------|------|--------|-----|
| Dashboard | 435 ms | **138,8 ms** | 15 ms | 11,8 ms | 0 | 0 |
| Mecze | 391 ms* | 0* | 15 ms | 6,0 ms | 0 | 0 |
| Treningi | 442 ms* | 0* | 15 ms | 5,3 ms | 0 | 0 |
| Zawodnicy | 340 ms* | 0* | 15 ms | 6,6 ms | 0 | 0 |
| Sponsorzy | 529 ms* | 0* | 15 ms | 8,7 ms | 0 | 0 |
| Finanse | 293 ms | **120,6 ms** | 15 ms | 8,6 ms | 0 | 0 |
| AI manager | 387 ms* | 0* | 15 ms | 7,0 ms | 0 | 0 |

\*DB profil > TTFB → zapytania równoległe; efektywny czas oczekiwania na Supabase w TTFB ≈ **TTFB − 15 ms − sieć − Next/React**.

### Podsumowanie źródeł (7 widoków chronionych)

| Źródło | Wnioski |
|--------|---------|
| **Supabase** | **Dominujące.** Layout ~293 ms (6× ~49 ms). Strony dodają 47–237 ms (profil page). Sponsorzy: 11 zapytań, najdłuższy łączny profil (529 ms). |
| **Next.js + React** | Widoczne gdy TTFB > DB + middleware: **Dashboard (+139 ms)**, **Finanse (+121 ms)** — serializacja RSC, komponenty, większy HTML (dashboard 103 KB). |
| **Middleware** | ~15 ms/trasa (JWT) — stały narzut auth. |
| **Sieć** | Localhost: 5–12 ms (~2% TTFB). Na produkcji (Vercel ↔ Supabase) typowo **+50–150 ms** RTT. |
| **PWA** | **0 ms w TTFB stron.** Osobno: API offline **383 ms** — ładowane z opóźnieniem w kliencie. |
| **OpenAI** | **0 ms** przy SSR wszystkich mierzonych tras. Koszt OpenAI pojawia się dopiero przy wysłaniu wiadomości w `/ai/chat` (poza tym pomiarem). |

### Diagram budżetu TTFB (widoki główne, średnia)

```
Średni TTFB chronionych widoków: ~385 ms

Supabase (efektywnie w TTFB)  ████████████████████  ~70–75%
Middleware (auth JWT)          ██                     ~4%
Next.js + React (reszta)       ████                   ~15–20%*
Sieć (localhost)               ░                      ~2%
OpenAI                         ░                      0%
PWA (defer, poza TTFB)         ░                      0% na HTML

* Głównie dashboard i finanse; pozostałe — RSC równoległy z DB, mały narzut React
```

### Login — dwa etapy

```
[Strona /login]     Next.js static RSC     ~25 ms   (94% szybka powłoka)
[POST auth]         Supabase Auth API      ~160 ms  (wąskie gardło UX logowania)
```

---

## Najwolniejsze obserwacje (bez napraw)

1. **`/notifications` (769 ms)** — najwolniejszy ekran w całej aplikacji; nie był w scope 8 widoków, ale wypada #1 w rankingu.
2. **Dashboard (589 ms)** — najwolniejszy z wymaganych widoków; 9 zapytań SQL + 103 KB HTML.
3. **Sponsorzy** — najcięższy profil DB (529 ms sekwencyjnie, 11 zapytań).
4. **Zawodnicy** — umiarkowany TTFB (331 ms), ale **największy transfer** (142 KB HTML).
5. **PWA API (383 ms)** — osobny koszt synchronizacji offline; nie blokuje pierwszego paint.
6. **Finanse** — 5 zapytań page zwraca błąd (brak tabel `finance_*` w instancji testowej); TTFB 428 ms pochodzi głównie z layoutu + RSC shell.
7. **OpenAI** — nie wpływa na cold load; agent ładuje się jak zwykła strona RSC (~348 ms).

---

## Porównanie z ETAP 13.5 (szacunki → pomiar)

| Widok | Szacunek 13.5 (TTFB) | Pomiar 13.6 | Zapyt. 13.5 → 13.6 |
|-------|----------------------|-------------|---------------------|
| Dashboard | 300–550 ms | **589 ms** | 6–10 → **9** |
| Mecze | 250–450 ms | **300 ms** | ~8 → **8** |
| Treningi | 280–500 ms | **263 ms** | ~8 → **9** |
| Zawodnicy | 250–400 ms | **331 ms** | ~7 → **7** |
| Sponsorzy | 300–500 ms | **434 ms** | ~10 → **11** |

Pomiar 13.6 potwierdza kierunek optymalizacji 13.5 (treningi/mecze w dolnej granicy), ale **dashboard i sponsorzy nadal >400 ms TTFB** — głównie latency Supabase (~49 ms/zapytanie) × liczba zapytań.

---

## Ograniczenia pomiaru

- **localhost** — brak CDN, edge, realnego RTT użytkownika
- **DB profil sekwencyjny** — zawyża `dbMs` vs równoległy RSC
- **Brak RUM w przeglądarce** — brak FCP/LCP/TTI, hydratacji React po kliencie
- **OpenAI** — zmierzony tylko wpływ na SSR (zero); chat streaming nieobjęty
- **Finanse** — niepełny profil SQL (brak migracji finance w DB testowej)
- **TOP 20** — 19 tras w obecnym zbiorze

---

## Pliki

| Plik | Opis |
|------|------|
| `scripts/measure-stage136.mjs` | Skrypt pomiarowy |
| `docs/audit/stage-13.6-measurements.json` | Surowe wyniki JSON |
| `npm run measure:stage136` | Uruchomienie pomiaru |

**ETAP 13.6 zakończony — tylko pomiar, bez zmian w kodzie aplikacji.**
