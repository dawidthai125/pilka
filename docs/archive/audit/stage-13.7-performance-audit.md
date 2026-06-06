# ETAP 13.7 — optymalizacja TTFB (post-fix)

**Data:** 2026-06-01  
**Zakres:** Dashboard, Sponsorzy, Finanse, AI Manager + layout wspólny  
**Status:** ✅ optymalizacje wdrożone, build OK, pomiar PO na `next start :3001`

Surowe dane PO: [`stage-13.7-measurements.json`](./stage-13.7-measurements.json)  
Baseline (13.6): [`stage-13.6-performance-measurements.md`](./stage-13.6-performance-measurements.md)

---

## Regiony infrastruktury (ważne)

| Usługa | Region | Źródło |
|--------|--------|--------|
| **Supabase** | **EU West 1 (Irlandia)** | Pooler `aws-0-eu-west-1.pooler.supabase.com` w `scripts/lib/db-client.mjs` i checklist wdrożenia |
| **Vercel (produkcja)** | **US East — `iad1` (Waszyngton)** | `vercel inspect pilka-mu.vercel.app` → wszystkie funkcje `[iad1]` |

### Wniosek regionalny

Masz **Supabase w Europie** i **Vercel w USA (East)**. Każde wywołanie Supabase z produkcji Vercel przechodzi transatlantycki RTT — typowo **+100–200 ms na request** niezależnie od kodu.

Na localhost pomiar nie uwzględnia tego narzutu. Po wdrożeniu na Vercel realny TTFB będzie wyższy o wielokrotność liczby round-tripów do Supabase.

**Rekomendacja (poza kodem):** Vercel → Project Settings → Functions → **Region: Frankfurt (`fra1`)** lub **Dublin (`dub1`)** — blisko Supabase EU West 1.

---

## Podsumowanie PRZED → PO

| Widok / warstwa | TTFB PRZED (13.6) | TTFB PO (13.7) | Cel | Status |
|-----------------|-------------------|----------------|-----|--------|
| **Layout wspólny (DB RPC)** | 293 ms (6× SQL) | **~49 ms** (1× RPC) | < 120 ms | ✅ |
| **Dashboard** | 589 ms | **271 ms** | < 300 ms | ✅ |
| **Sponsorzy** | 434 ms | **296 ms** | < 250 ms | ⚠️ −32%, brakuje ~46 ms |
| **Finanse** | 428 ms | **288 ms** | < 300 ms | ✅ |
| **AI Manager** | 348 ms | **295 ms** | < 300 ms | ✅ |

**Średnia TTFB 4 widoków:** 450 ms → **288 ms** (**−36%**)

---

## Analiza PRZED — co spowalniało

### Layout wspólny (każde wejście chronione)

| Zapytanie | PRZED | Cache? | Równolegle? |
|-----------|-------|--------|-------------|
| `profiles` | ~50 ms | React `cache` per request | tak (Promise.all) |
| `club_memberships` | ~49 ms | tak | tak |
| `clubs` | ~47 ms | tak | tak |
| `teams` | ~49 ms | tak | tak |
| `club_notifications` (COUNT) | ~50 ms | nie | tak |
| `website_settings` | ~49 ms | nie (pełny SELECT) | tak |

**Problem:** 6 osobnych round-tripów PostgREST (~50 ms każdy) + waterfall layout → page. Suma sekwencyjna profilu: **293 ms**.

### Dashboard (`/dashboard`)

| Zapytanie | PRZED |
|-----------|-------|
| Layout (6×) | ~293 ms |
| `players` COUNT ×2 | ~95 ms |
| `player_documents` + `players` (alerty) | ~142 ms |
| **Razem profil SQL** | **9 zapytań, ~435 ms** |
| **TTFB** | **589 ms** (+ 103 KB RSC) |

### Sponsorzy (`/sponsors`)

| Zapytanie | PRZED |
|-----------|-------|
| Layout | ~293 ms |
| `sponsors` lista | ~50 ms |
| `sponsors` COUNT | ~50 ms |
| `sponsor_contracts` | ~50 ms |
| `sponsor_leads` COUNT | ~50 ms |
| `sponsor_publications` COUNT | ~50 ms |
| **Razem** | **11 zapytań, ~529 ms profil** |
| **TTFB** | **434 ms** |

### Finanse (`/finance`)

| Zapytanie | PRZED |
|-----------|-------|
| Layout | ~293 ms |
| RPC `get_finance_dashboard_totals` | 1× |
| `finance_player_fees` overdue | 1× |
| `finance_income` recent | 1× |
| `finance_expenses` recent | 1× |
| **TTFB** | **428 ms** |

### AI Manager (`/ai/manager`)

| Zapytanie | PRZED |
|-----------|-------|
| Layout | ~293 ms |
| `ai_memory` | ~47 ms |
| `ai_action_approvals` | ~47 ms |
| **TTFB** | **348 ms** |

---

## Co zrobiono (tylko optymalizacja)

### 1. RPC — agregacja round-tripów

Migracja: `supabase/migrations/20260615150000_stage137_performance.sql`  
Aplikacja: `npm run db:migrate:stage137`

| RPC | Zastępuje | Widoki |
|-----|-----------|--------|
| `get_app_layout_context(club_id)` | 6 zapytań layoutu | wszystkie chronione |
| `get_home_dashboard_stats(club_id)` | 3–4 zapytania dashboardu | `/dashboard` |
| `get_sponsor_dashboard_stats(club_id)` | 5 zapytań statystyk | `/sponsors` |
| `get_finance_dashboard_page(club_id)` | 4 równoległe zapytania | `/finance` |
| `get_ai_manager_snapshot(club_id)` | memory + approvals | `/ai/manager` |

### 2. Refaktor loaderów

- `getDashboardContext()` → **1× RPC** zamiast 6× SELECT
- `getHomeDashboardStats()` → **1× RPC** (counts + alerty dokumentów)
- `getSponsorDashboardStats()` → **1× RPC**
- `getFinanceDashboardStats()` → **1× RPC**
- `getAiManagerSnapshot()` → **1× RPC**

Pliki: `src/lib/auth/session.ts`, `src/lib/ai/agent/loaders.ts`, strony dashboard / ai manager.

### 3. Streaming RSC (dashboard)

Sekcje zawodników i alertów dokumentów w **`Suspense`** — TTFB nie czeka na `get_home_dashboard_stats`.

Pliki: `src/features/dashboard/components/dashboard-player-section.tsx`, `src/app/(dashboard)/dashboard/page.tsx`.

### 4. Indeksy (z 13.5, bez zmian)

`idx_club_notifications_unread_user` — przyspiesza COUNT w layout RPC.

---

## Analiza PO — liczba zapytań HTTP → Supabase

| Widok | Round-tripy PRZED | Round-tripy PO |
|-------|-------------------|----------------|
| Layout | 6 + auth | **1 RPC** + auth |
| Dashboard | +3 (blokuje TTFB) | **0 w TTFB** (Suspense, 1 RPC w streamie) |
| Sponsorzy | +5 stats + 1 lista | **1 RPC stats** + 1 lista |
| Finanse | +4 | **1 RPC** |
| AI Manager | +2 | **1 RPC** |

Profil RPC (direct pg, EU pooler):

| RPC | Czas |
|-----|------|
| `get_app_layout_context` | **49 ms** |
| `get_home_dashboard_stats` | **52 ms** |
| `get_sponsor_dashboard_stats` | **51 ms** |

---

## Tabela szczegółowa PRZED → PO

| Metryka | Dashboard | Sponsorzy | Finanse | AI Manager |
|---------|-----------|-----------|---------|------------|
| **TTFB PRZED** | 589 ms | 434 ms | 428 ms | 348 ms |
| **TTFB PO** | **271 ms** | **296 ms** | **288 ms** | **295 ms** |
| **Δ TTFB** | **−54%** | **−32%** | **−33%** | **−15%** |
| Zapyt. layout PRZED | 6 | 6 | 6 | 6 |
| Zapyt. layout PO | **1 RPC** | **1 RPC** | **1 RPC** | **1 RPC** |
| Zapyt. page PRZED | 3 | 5 | 4 | 2 |
| Zapyt. page PO | **1 RPC*** | **1 RPC + lista** | **1 RPC** | **1 RPC** |
| Transfer PRZED | 103 KB | 70 KB | 63 KB | 61 KB |
| Transfer PO | 107 KB | 70 KB | 63 KB | 61 KB |

\* Dashboard: RPC w streamie Suspense, nie w pierwszym TTFB.

---

## Dlaczego Sponsorzy jeszcze > 250 ms

1. **Lista sponsorów** (`getSponsors`) nadal wymaga osobnego SELECT — ~50 ms + serializacja RSC.
2. **Waterfall Next.js:** layout musi zakończyć się przed page (TTFB = layout + shell strony).
3. **Produkcja Vercel `iad1` → Supabase EU** doda kolejne ~100–200 ms × liczba round-tripów.

Aby zejść poniżej 250 ms lokalnie: Suspense na liście sponsorów (analogicznie do dashboardu) lub przeniesienie regionu Vercel.

---

## Co można cacheować (kolejny krok, bez nowych funkcji)

| Dane | Zmienność | Propozycja |
|------|-----------|------------|
| `clubs`, `teams` | rzadko | `unstable_cache` 300 s (już częściowo w layout RPC) |
| `website_settings` (kolory PWA) | rzadko | tag revalidate przy zapisie CMS |
| `match_filter_options` | średnio | ✅ cache 300 s (13.5) |
| `unread_notifications` | często | **nie cacheować** |
| `sponsor_dashboard_stats` | średnio | opcjonalnie cache 60 s |

---

## Weryfikacja

```bash
npm run db:migrate:stage137
npm run build
npx next start -p 3001
MEASURE_BASE_URL=http://localhost:3001 npm run measure:stage136
node scripts/profile-stage137-rpc.mjs
```

**Uwaga:** pełny moduł finansów wymaga `npm run db:migrate:finance-audit` (funkcja `actor_can_read_finance`, tabele `finance_*`). RPC finansów używa fallbacku ról bez enum `treasurer`.

---

## Pliki

| Plik | Opis |
|------|------|
| `supabase/migrations/20260615150000_stage137_performance.sql` | 5 funkcji RPC |
| `scripts/profile-stage137-rpc.mjs` | profil czasu RPC |
| `npm run db:migrate:stage137` | migracja |

**ETAP 13.7 zakończony — wyłącznie optymalizacja, bez nowych funkcji produktowych.**
