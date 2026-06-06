# ETAP 13.9 — diagnoza `/api/pwa/offline-data` (pomiar)

**Data:** 2026-06-01  
**Zakres:** TTFB endpointu PWA offline na produkcji  
**Status:** ✅ pomiar zakończony — **bez zmian w kodzie**

Powiązane: [ETAP 13.8 — infrastruktura](./stage-13.8-production-infrastructure.md) · [pomiary prod 13.8](./stage-13.8-prod-measurements.json) · [surowe dane 13.9](./stage-13.9-pwa-api-measurements.json)

Skrypt: `npm run measure:stage139` (`scripts/measure-stage139-pwa-api.mjs`)

---

## Werdykt (TL;DR)

| Metryka | Wartość (prod) | Uwagi |
|---------|----------------|-------|
| **TTFB (pierwszy request, cold λ)** | **783–1998 ms** | Zależny od cold startu Vercel |
| **TTFB (13.8, pojedynczy pomiar)** | **1404 ms** | Pierwsze wywołanie po sesji pomiarowej |
| **TTFB warm (średnia req 2–8)** | **414 ms** | Funkcja już „ciepła” |
| **TTFB warm (minimum)** | **341 ms** | Dolna granica przy powtarzalnych hitach |
| **Rozmiar odpowiedzi** | **4,9 KB** | Nie jest bottleneckiem |
| **Wywołanie z UI** | **Nie** przy każdej nawigacji | TTL 5 min w `sessionStorage` |

**Główna przyczyna wysokiego TTFB (~1404 ms):** suma **cold start serverless** + **podwójnego auth Supabase** (middleware Edge + route) + **5 zapytań DB** (1 RPC layout + 4 REST) + **brak cache** (origin przy każdym hit).

---

## 1. Metodologia pomiaru

1. Logowanie testowe (`wlasciciel@piorun.test`) → cookie Supabase SSR.
2. **8 kolejnych GET** `/api/pwa/offline-data` z `Cache-Control: no-cache` (klient).
3. **Auth probe:** bezpośredni `GET /auth/v1/user` (proxy czasu `getUser()`).
4. **DB profile:** bezpośredni PostgreSQL (pooler EU) — te same 5 zapytań co w route, sekwencyjnie i szacunek równoległy.
5. **Breakdown:** algebra residualna (first request − auth×2 − DB − serializacja = cold start).

Środowisko prod: `https://pilka-mu.vercel.app`, region funkcji **`fra1`** (po ETAP 13.8).

---

## 2. Breakdown czasu odpowiedzi (prod)

### 2.1 Tabela — pierwszy vs warm request

| Składnik | Pierwszy request (TTFB) | Warm (średnia req 2–8) | Warm (min) | Źródło pomiaru |
|----------|-------------------------|------------------------|------------|----------------|
| **Middleware — auth** | **140,7 ms** | ~140 ms* | ~140 ms* | Auth probe = `getUser()` |
| **Route — auth** | **140,7 ms** | (w warm overhead) | (w warm overhead) | `requireUser()` → ten sam typ wywołania |
| **DB (równoległy szacunek)** | **176,7 ms** | **176,7 ms** | **176,7 ms** | PG profile: RPC + max(4 queries) |
| **Serializacja JSON** | **~2 ms** | **~2 ms** | **~2 ms** | 4,9 KB — pomijalne |
| **Cold start + runtime (reszta)** | **322,9 ms** | **0 ms** | **0 ms** | Residual z req_1 |
| **Sieć + auth warm overhead** | — | **235,4 ms** | **~164 ms** | Residual warm − DB − ser |
| **TTFB łącznie** | **783 ms** | **414 ms** | **341 ms** | HTTP samples |

\* Middleware i route to **osobne runtimes** (Edge vs Node λ) — `React.cache()` **nie deduplikuje** auth między nimi.

### 2.2 Szczegóły zapytań SQL (PG profile, prod)

| Zapytanie | Czas (ms) | Uwagi |
|-----------|-----------|-------|
| `get_app_layout_context` (RPC) | 93,5 | Pełny layout — nadmiarowy dla PWA payload |
| `matches` (LIMIT 10) | 83,2 | Równolegle w route |
| `trainings` (LIMIT 10) | 61,6 | Równolegle |
| `website_settings` | 48,8 | **Duplikat** — kolory też w RPC layout |
| `website_news` (LIMIT 5) | 56,7 | Równolegle |
| **Suma sekwencyjna** | **343,8 ms** | Gdyby wykonywać po kolei |
| **Szacunek równoległy** | **176,7 ms** | RPC + max(page queries) |

**Liczba zapytań SQL na request:** 5 (1 RPC + 4 REST przez PostgREST).  
**HTTP round-tripów do Supabase:** ~**7** (2× auth + 1 RPC + 4 REST).

### 2.3 Porównanie z ETAP 13.8 (1404 ms)

| Pomiar | TTFB | Kontekst |
|--------|------|----------|
| ETAP 13.8 (single) | **1403,6 ms** | Jeden hit po innych stronach — prawdopodobnie **cold λ PWA route** |
| ETAP 13.9 req_1 (run A) | **1997,8 ms** | Silny cold start |
| ETAP 13.9 req_1 (run B) | **783 ms** | Łagodniejszy cold (pula ciepła) |
| ETAP 13.9 warm min | **341 ms** | Stabilny warm path |

**Wniosek:** ~1404 ms to typowy **pierwszy hit na zimną funkcję API**, nie stały warm TTFB.

### 2.4 Referencja localhost (`next dev :3000`)

| Metryka | Wartość |
|---------|---------|
| TTFB req_1 | 920,6 ms (dev compile overhead) |
| TTFB warm avg | 286,5 ms |
| TTFB warm min | 222,1 ms |

Dev mode zniekształca cold start — porównanie prod ↔ local tylko orientacyjne.

---

## 3. Analiza obszarów (9 punktów)

### 3.1 Cold start

| Dowód | Wartość |
|-------|---------|
| req_1 vs warm avg | 783 ms vs 414 ms (**+369 ms**) |
| Ekstremum (run A) | 1998 ms vs 455 ms warm |
| Bundle λ | ~1,18 MB (`fra1`, ETAP 13.8) |
| `x-vercel-cache` | **MISS** na wszystkich 8 requestach |

Cold start to **#1 przyczyna** wysokiego TTFB przy pierwszym wywołaniu po idle / deploy.

### 3.2 Supabase auth

- **Middleware** (`src/middleware.ts`): `supabase.auth.getUser()` na **każdym** requeście pasującym do matchera, w tym `/api/*`.
- **Route** (`getDashboardContext` → `requireUser` → `getUser`): drugi identyczny typ wywołania w **innym runtime**.
- **Auth probe (prod):** **140,7 ms** na jedno `getUser`.
- **Szacunek łącznie:** **~281 ms** auth na warm path (~68% warm TTFB).

### 3.3 Session refresh

- Pomiar z **świeżo wydanym access token** (sign-in tuż przed serią).
- Brak obserwowalnego refresh token flow w probe (pojedyncze `GET /auth/v1/user`, status 200).
- Middleware `setAll(cookies)` **może** odświeżyć sesję przy wygasającym tokenie — nie mierzone w tym teście; przy długiej sesji użytkownika może dodać **+1 round-trip** do Auth API.
- **Wniosek:** session refresh **nie wyjaśnia** 1404 ms w tym pomiarze; stały koszt to walidacja JWT przez Auth API (`getUser`), nie lokalny decode.

### 3.4 Middleware

```37:66:src/middleware.ts
export async function middleware(request: NextRequest) {
  // ...
  const {
    data: { user },
  } = await supabase.auth.getUser();
```

- Matcher: wszystko poza `_next/static`, obrazkami, favicon → **obejmuje `/api/pwa/offline-data`**.
- Dla tego endpointu middleware **nie redirectuje** (nie jest protected page route), ale **zawsze wykonuje auth**.
- Middleware = **Edge (global POP)**; API route = **`fra1` λ** → dodatkowy hop Edge → origin.

### 3.5 RPC

- Route wywołuje `get_app_layout_context` przez `getDashboardContext()` — RPC z ETAP 13.7 pod **layout dashboard**, nie pod slim PWA cache.
- Czas RPC (prod PG): **93,5 ms**.
- Payload RPC (profile, club, teams, permissions, settings…) — **większość nie trafia** do JSON PWA (route buduje własny payload).

### 3.6 Liczba zapytań SQL

| Warstwa | Zapytania |
|---------|-----------|
| Route (jawne) | 1 RPC + 4 SELECT |
| Middleware | 0 SQL (tylko Auth HTTP) |
| Auth ×2 | 0 SQL (Auth HTTP) |
| **Razem danych** | **5 zapytań SQL** |
| **Razem HTTP Supabase** | **~7** |

ETAP 13.8 (`pageDbMs` dla PWA): 4 page queries + layout context ≈ **10 zapytań** w szerszym profilu sesji — spójne z duplikacją layout RPC.

### 3.7 Rozmiar odpowiedzi

| Metryka | Wartość |
|---------|---------|
| Body | **5055 B (~4,9 KB)** |
| `Cache-Control` | `private, no-store` |
| Wpływ na TTFB | **Pomijalny** (~2 ms serializacji) |

### 3.8 Cache

| Warstwa | Polityka | Skutek |
|---------|----------|--------|
| HTTP response | `private, no-store` | Brak CDN/browser cache |
| Fetch klienta | `cache: "no-store"` | Wymusza revalidate |
| Service Worker | `NetworkOnly` dla `/api/*` | SW **nigdy** nie serwuje z cache |
| Vercel | `x-vercel-cache: MISS` | Każdy hit → origin λ |

**Każde dozwolone wywołanie = pełny koszt origin.**

### 3.9 Service Worker

```51:52:src/sw.ts
      sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
```

SW przepuszcza request do sieci — **nie maskuje** wolnego TTFB. Offline dane idą do **IndexedDB** po stronie klienta (`sync-queue.ts`), nie z SW cache API.

---

## 4. Kiedy endpoint jest wywoływany?

Źródło: `PwaProvider` w `(dashboard)/layout.tsx` + `refreshOfflineCacheFromApi`.

| Scenariusz | Wywołanie API? | Uzasadnienie |
|------------|----------------|--------------|
| **Każde wejście do aplikacji (nowa karta)** | **Tak** (po 2,5 s) | Mount layoutu dashboard → `setTimeout(2500)` |
| **Pełne odświeżenie (F5)** | **Tak** (po 2,5 s) | Remount layoutu |
| **Nawigacja między ekranami** (dashboard → mecze → finanse) | **Nie** | `(dashboard)/layout` **nie remountuje**; TTL 5 min |
| **Powrót w tej samej sesji (< 5 min)** | **Nie** | `sessionStorage` key `fcos:pwa-offline-refreshed-at` |
| **Reconnect online** | **Tak** (`force=true`) | Po `flushSyncQueue` w `registerSyncOnReconnect` |
| **Każdy request SSR strony** | **Nie** | Osobny client-side fetch |

Defer **2500 ms** — API startuje **po** TTFB dashboardu, nie blokuje pierwszego paint, ale obciąża sieć w tle.

---

## 5. Ścieżka kodu (skrót)

```
Klient (PwaProvider, +2,5s)
  → fetch /api/pwa/offline-data { cache: "no-store" }
  → SW: NetworkOnly
  → Edge Middleware: getUser()           ~141 ms
  → λ fra1 GET handler:
       getDashboardContext()
         requireUser() → getUser()        ~141 ms
         rpc get_app_layout_context       ~94 ms (w RPC; równolegle z resztą tylko po auth)
       Promise.all ×4 REST                ~83 ms (max)
       JSON 4,9 KB                        ~2 ms
  ← 200 no-store
  → IndexedDB (offline-store)
```

---

## 6. TOP 10 przyczyn opóźnienia

| # | Przyczyna | Szacowany wpływ | Kategoria | Dowód |
|---|-----------|-------------------|-----------|-------|
| **1** | **Serverless cold start** (pierwsze wywołanie λ) | **+300–1200 ms** vs warm | cold_start | req_1 783–1998 ms vs warm avg 414 ms |
| **2** | **Duplikacja auth** (middleware Edge + route) | **~281 ms** (~68% warm) | auth | 140,7 ms × 2 |
| **3** | **Pełny RPC `get_app_layout_context`** zamiast slim PWA | **~94 ms** + nadmiar danych | rpc | PG profile 93,5 ms |
| **4** | **4 równoległe SELECT** (matches, trainings, settings, news) | **~83 ms** (max równoległy) | sql | q_matches 83,2 ms |
| **5** | **Brak cache** (`no-store` + SW NetworkOnly + Vercel MISS) | Każdy hit = full origin | cache | Wszystkie sample MISS |
| **6** | **Redundantne `website_settings`** (RPC + query) | **~49 ms** + bytes | sql | q_settings 48,8 ms |
| **7** | **7+ HTTP round-tripów** do Supabase (EU) z λ fra1 | **~150–250 ms** overhead sieci | network | 2 auth + 5 data |
| **8** | **Warm path: RTT + runtime** ponad czysty DB | **~164–235 ms** | network | warm min 341 ms > DB 177 ms |
| **9** | **Duży bundle λ (~1,18 MB)** | Wolniejszy bootstrap cold | cold_start | ETAP 13.8 inspect |
| **10** | **Serializacja JSON 4,9 KB** | **~2 ms** | serialization | Pomijalne |

---

## 7. Odpowiedzi na pytania ETAP 13.9

| Pytanie | Odpowiedź |
|---------|-----------|
| Dlaczego ~1404 ms? | Cold λ + ~281 ms auth + ~177 ms DB + sieć; pierwszy hit po idle |
| Czy cold start? | **Tak** — dominuje przy req_1 |
| Czy Supabase auth? | **Tak** — ~141 ms × **2** |
| Czy session refresh? | **Nie w tym teście**; stały koszt walidacji JWT |
| Czy middleware? | **Tak** — auth na każdym `/api/*` |
| Czy RPC? | **Tak** — pełny layout context |
| Ile SQL? | **5** (1 RPC + 4 REST) |
| Rozmiar odpowiedzi? | **4,9 KB** — OK |
| Cache? | **Brak** na wszystkich warstwach |
| Service Worker? | **NetworkOnly** — nie pomaga |
| Przy każdym wejściu? | Przy **nowej sesji layoutu** (+ TTL) |
| Przy odświeżeniu? | **Tak** |
| Przy nawigacji ekranów? | **Nie** (TTL 5 min) |

---

## 8. Pliki i reprodukcja

```bash
# Produkcja
MEASURE_BASE_URL=https://pilka-mu.vercel.app npm run measure:stage139

# Lokalnie (next dev / start)
MEASURE_BASE_URL=http://localhost:3000 npm run measure:stage139
```

Wynik JSON: [`stage-13.9-pwa-api-measurements.json`](./stage-13.9-pwa-api-measurements.json)

**Uwaga:** Ten etap **nie wprowadza poprawek** — wyłącznie pomiar i diagnoza. Optymalizacje → osobny etap.
