# Audyt wydajności ETAP 13.5 (post-fix)

**Data:** 2026-06-01  
**Zakres:** szybkość, czas ładowania, koszty Supabase/OpenAI/Vercel  
**Status:** ✅ optymalizacje wdrożone, build OK

---

## Podsumowanie PRZED → PO

| Metryka | PRZED | PO | Zmiana |
|---------|-------|-----|--------|
| Suma zapytań RSC (10 tras) | 92 | 77 | **−16%** |
| Layout dashboard (zapytania) | 7–8 | 6 | **−14–25%** |
| PWA fetch przy nawigacji | +10 zapytań | ~2 (amortyzacja TTL 5 min) | **~−80%** |
| `/training` (zapytania) | 11 | 8 | **−27%** |
| `/players` payload SQL | 20 kolumn | 9 kolumn | **~−55% danych** |
| `buildAiClubContext` (cold) | ~34 | ~31 | **−9%** |
| Agent multi-tool (read) | N× context | 1× context | **−50–90%** |
| OpenAI na load stron | 0 | 0 | bez zmian |
| Build | OK | OK | ✅ |

**Szacowany łączny wzrost wydajności:** **20–35%** (RSC + PWA + AI agent), **40–60%** mniej obciążenia Supabase przy intensywnej nawigacji dzięki PWA throttle.

Weryfikacja: `npm run benchmark:stage135`

---

## Analiza per widok

### 1. Dashboard (`/dashboard`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL (RSC) | 7–11 | 6–10 |
| Supabase calls | layout 7 + opcjonalnie 4 (alerty) | layout 6 równolegle + 4 |
| OpenAI | 0 | 0 |
| Czas ładowania (szac.) | ~400–700 ms TTFB | ~300–550 ms |

**Fix:** `getDashboardContext` — równoległe `unreadNotifications` + `websiteSettings`; PWA odroczone 2,5 s + TTL 5 min.

---

### 2. Mecze (`/matches`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL | ~9 | ~8 |
| OpenAI | 0 | 0 |
| Problemy | pełny scan filtrów co request | `unstable_cache` 300 s |

**Fix:** cache filtrów sezon/konkurencja.

---

### 3. Treningi (`/training`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL | ~11 | ~8 |
| OpenAI | 0 | 0 |
| N+1 | brak | brak |
| Problemy | `getClubMembers` (wszyscy) dla coachów | filtrowane role + `getTeams` cache |

**Fix:** dedykowany `getCoaches` (2 zapytania + cache teams).

---

### 4. Zawodnicy (`/players`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL | ~9 (dup. teams) | ~7 |
| OpenAI | 0 | 0 |
| Payload | `PLAYER_SELECT` | `PLAYER_LIST_SELECT` |

**Fix:** slim list + `loadTeamNameMap` → reuse `getTeams`.

---

### 5. Sponsorzy (`/sponsors`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL | ~12 | ~11 |
| OpenAI | 0 | 0 |
| Payload | `select *` × 500 | 9 kolumn |

**Fix:** `SPONSOR_LIST_SELECT`.

---

### 6. Finanse (`/finance`)

| | PRZED | PO |
|---|-------|-----|
| Zapytania SQL | ~11 | ~10 |
| OpenAI | 0 | 0 |
| Wzorzec | RPC + Promise.all | bez zmian (już optymalne) |

**Fix:** szybszy layout (−1 zapytanie).

---

### 7. AI (`/ai`, `/ai/manager`, `/ai/chat`, `/ai/reports`)

| Trasa | Zapytania PRZED | PO | OpenAI load |
|-------|-----------------|-----|-------------|
| `/ai` | 8 | 7 | 0 |
| `/ai/manager` | 9 | 8 | 0 |
| `/ai/chat` | 8 | 7 | 0 |
| `/ai/reports` | 8 | 7 | 0 |

**Fix agenta (runtime):** jeden `buildAiClubContext` na polecenie z wieloma read tools; slim players w context builder; cap attendance 800.

OpenAI koszt: bez zmian na load; oszczędność przy agent command (mniej DB przed ewentualnym API call).

---

### 8. Strona publiczna

| Trasa | PRZED | PO | Cache |
|-------|-------|-----|-------|
| `/` | ~9 | ~9 | ISR 60 s + `cache()` |
| `/aktualnosci` | wszystkie newsy | **limit 50** | ISR 60 s |

**Fix:** limit newsów; indeks `idx_website_news_club_published`.

---

## TOP 20 najwolniejszych miejsc

| # | Miejsce | PRZED | PO | Status |
|---|---------|-------|-----|--------|
| 1 | PWA `/api/pwa/offline-data` | +10/nav | defer + TTL | ✅ |
| 2 | `buildAiClubContext` cold | ~34 queries | ~31 | ✅ |
| 3 | `getDashboardContext` | sekwencyjny unread | Promise.all | ✅ |
| 4 | Agent read tools loop | N× context | 1× shared | ✅ |
| 5 | `getCoaches` | full members | filtered | ✅ |
| 6 | `loadTeamNameMap` | dup. teams | getTeams cache | ✅ |
| 7 | `getPlayers` list | 20 cols | 9 cols | ✅ |
| 8 | `getMatchFilterOptions` | every hit | cache 300s | ✅ |
| 9 | `getSponsors` list | select * | slim columns | ✅ |
| 10 | `/aktualnosci` | unbounded | limit 50 | ✅ |
| 11 | Layout `website_settings` | sequential | parallel | ✅ |
| 12 | AI attendance scan | limit 2000 | limit 800 | ✅ |
| 13 | PWA trainings column | `title` (błąd) | `name` | ✅ |
| 14–17 | Brakujące indeksy DB | seq scan | partial indexes | ✅ |
| 18 | Calendar filter refetch | full RSC | — | ℹ️ UX |
| 19 | Sponsor stats contracts | 200 rows JS | — | ℹ️ P3 |
| 20 | AI chat previews | global 200 msgs | — | ℹ️ P3 |

---

## Znalezione problemy (kategorie)

| Kategoria | Znalezisko | Naprawa |
|-----------|------------|---------|
| N+1 | brak klasycznego N+1 w głównych trasach | — |
| Brak indeksów | notifications, news, documents, memberships | migracja `20260615140000` |
| Niepotrzebne zapytania | dup. teams, full members for coaches | dedup + filter |
| Niepotrzebne renderowania | PWA sync on mount | defer 2,5 s |
| Ciężkie komponenty | kalendarze client-side | bez zmian (UX) |
| Cache | brak na filtrach meczów | `unstable_cache` |
| Promise.all | layout niepełny | rozszerzony context |
| Server Components | dominują | bez regresji |
| Dynamic rendering | dashboard SSR | bez zmian |

---

## Pomiary po poprawkach

```bash
npm run benchmark:stage135   # 77/92 queries, markery OK
npm run typecheck            # OK
npm run build                # OK
npm run db:migrate:stage135  # indeksy Supabase
```

---

## Pliki zmienione

```
src/lib/auth/session.ts
src/lib/players/mappers.ts
src/lib/ai/context.ts
src/lib/ai/agent/runner.ts
src/lib/ai/agent/tools/read.ts
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/players/page.tsx
src/app/(public)/aktualnosci/page.tsx
src/app/api/pwa/offline-data/route.ts
src/components/pwa/pwa-provider.tsx
src/lib/pwa/sync-queue.ts
supabase/migrations/20260615140000_stage135_performance.sql
scripts/benchmark-stage135.mjs
package.json
```

---

## Koszty (szacunek)

| Usługa | Wpływ optymalizacji |
|--------|---------------------|
| **Supabase** | −16% zapytań RSC; −40–80% przy nawigacji (PWA TTL) |
| **OpenAI** | 0 na page load; agent: mniej opóźnienia przed call (szybszy context) |
| **Vercel** | krótszy SSR → mniej CPU-ms na request; ISR public bez zmian |

---

## Otwarte (P3, poza zakresem)

- Client-side filter kalendarzy (bez full RSC refetch)
- RPC agregacji sponsor stats
- Poprawa preview w `getAiConversations`
- Lazy module sections w `buildAiClubContext` per tool

**ETAP 13.5 zakończony** — wyłącznie optymalizacja, bez nowych funkcji.
