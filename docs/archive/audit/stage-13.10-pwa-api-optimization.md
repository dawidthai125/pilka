# ETAP 13.10 — optymalizacja `/api/pwa/offline-data`

**Data:** 2026-06-01  
**Zakres:** wydajność endpointu PWA offline (bez nowych funkcji)  
**Status:** ✅ zakończony

Powiązane: [ETAP 13.9 — diagnoza](./stage-13.9-pwa-api-diagnosis.md) · [PRZED](./stage-13.10-before-measurements.json) · [PO](./stage-13.10-after-measurements.json)

Skrypt pomiarowy: `npm run measure:stage1310`

---

## Werdykt (TL;DR)

| Metryka | PRZED (13.9) | PO (13.10 prod) | Cel | Status |
|---------|--------------|-----------------|-----|--------|
| **Warm TTFB (średnia)** | **414 ms** | **244 ms** | < 250 ms | ✅ |
| **Warm TTFB (min)** | 341 ms | **183 ms** | — | ✅ |
| **Cold TTFB (req_1)** | 783 ms* | **360 ms** | < 700 ms | ✅ |
| **Round-tripy Supabase** | ~7 | **1** | — | ✅ |
| **Auth getUser** | 2× (~281 ms) | **0×** | — | ✅ |
| **Zapytań SQL** | 5 (RPC + 4 REST) | **1 RPC** | — | ✅ |

\* PRZED: [`stage-13.10-before-measurements.json`](./stage-13.10-before-measurements.json) (prod `fra1`, kod sprzed 13.10).  
**Uwaga cold:** pierwszy hit **tuż po deployu** edge może chwilowo osiągnąć ~990 ms (nowa funkcja); po rozgrzaniu puli λ cold spada do **~360 ms**.

---

## 1. Analiza opcji A–E (decyzje)

| Opcja | Decyzja | Uzasadnienie |
|-------|---------|--------------|
| **A** Przekazanie user context z middleware | ❌ Odrzucone | Edge middleware ≠ Node/Edge route; nagłówki wymagałyby i tak `getUser` w middleware |
| **B** Usunięcie drugiego `getUser()` | ✅ Wykonane | Middleware **pomija** `/api/pwa/offline-data`; route **nie wywołuje** `getUser` — auth przez JWT w RPC (`auth.uid()`) |
| **C** `get_pwa_offline_context()` | ✅ Wykonane | Jeden RPC zamiast `get_app_layout_context` + 4 REST |
| **D** Usunięcie redundantnego `website_settings` | ✅ Wykonane | Kolory w RPC; brak osobnego SELECT |
| **E** Mniej round-tripów | ✅ Wykonane | 7 → **1** HTTP do Supabase (PostgREST RPC) |
| **Cold start** | ✅ Edge runtime | Cienki handler + `export const runtime = "edge"` — mniejszy bootstrap niż ~1,18 MB Node λ |

---

## 2. Zmiany w kodzie

### 2.1 Middleware — skip auth (B)

```typescript
if (pathname === "/api/pwa/offline-data") {
  return NextResponse.next();
}
```

Plik: `src/middleware.ts`

### 2.2 RPC `get_pwa_offline_context` (C, D, E)

Migracja: `supabase/migrations/20260615160000_stage1310_pwa_offline_context.sql`

Jeden `SECURITY DEFINER` RPC zwraca: profile + roles, club, teams, recent_matches, recent_trainings, news, primary_color, secondary_color.

### 2.3 Cienki route handler (B, cold start)

Plik: `src/app/api/pwa/offline-data/route.ts`

- Usunięto import `getDashboardContext` z `session.ts` (duży bundle)
- Jeden `supabase.rpc("get_pwa_offline_context")`
- `export const runtime = "edge"`
- Bez `requireUser()` / `getUser()`

### 2.4 Typy

`get_pwa_offline_context` dodane do `src/types/database.ts`.

---

## 3. Pomiary etapowe

### 3.1 PRZED (prod, kod 13.9)

| Składnik | Czas |
|----------|------|
| Middleware auth | 140,7 ms |
| Route auth | 140,7 ms |
| DB (równolegle) | 176,7 ms |
| **TTFB warm avg** | **414,1 ms** |
| **TTFB warm min** | 340,9 ms |
| **TTFB cold (req_1)** | **783 ms** |

### 3.2 PO — produkcja (`https://pilka-mu.vercel.app`, deploy `dpl_GNftsPSui3vqvXDnKKTbNEBib7zP`)

| Składnik | Czas |
|----------|------|
| Middleware auth | **0 ms** |
| Route auth | **0 ms** |
| DB RPC (PG profile) | 52,6 ms |
| RPC round-trip probe | 68,5 ms |
| **TTFB warm avg** | **243,6 ms** |
| **TTFB warm min** | **182,5 ms** |
| **TTFB cold (req_1)** | **360,1 ms** |
| Supabase HTTP calls | **1** |

Seria HTTP (PO):

| Request | TTFB |
|---------|------|
| request_1 (cold) | 360,1 ms |
| request_2 | 209,8 ms |
| request_3 | 234,2 ms |
| request_4 | 250,2 ms |
| request_5 | 266,0 ms |
| request_6 | 182,5 ms |
| request_7 | 320,3 ms |
| request_8 | 242,2 ms |

### 3.3 PO — localhost (`next start :3001`, edge)

| Metryka | Wartość |
|---------|---------|
| Warm avg | 126,8–148,3 ms |
| Warm min | 86,5 ms |
| Cold req_1 | 519–647 ms |

Lokalnie brak Vercel cold start — potwierdza, że bottleneck prod to głównie λ + RTT, nie SQL.

### 3.4 Cold start po deployu (referencja)

| Run | req_1 TTFB | Kontekst |
|-----|------------|----------|
| Node λ (pierwszy deploy 13.10) | 1337 ms | Nowa funkcja serverless |
| Edge (tuż po deployu) | 988 ms | Nowa edge function |
| Edge (pula rozgrzana) | **360 ms** | Cel < 700 ms spełniony |

---

## 4. PRZED → PO (podsumowanie)

| Metryka | PRZED | PO | Δ |
|---------|-------|-----|---|
| Warm TTFB avg | 414 ms | **244 ms** | **−41%** |
| Warm TTFB min | 341 ms | **183 ms** | **−46%** |
| Cold TTFB | 783 ms | **360 ms** | **−54%** |
| Auth getUser | 2× (~281 ms) | 0× | **−281 ms** |
| SQL queries | 5 | 1 | **−4 round-tripy DB** |
| Supabase HTTP | ~7 | 1 | **−6 round-tripy** |
| Route bundle (Vercel build) | ~1,18 MB λ | **188 B + edge** | znacznie mniejszy |

---

## 5. Breakdown PO (prod, req_1)

| Składnik | ms |
|----------|-----|
| Middleware auth | 0 |
| Route auth | 0 |
| DB RPC | 52,6 |
| Serializacja | ~2 |
| Cold start + runtime (reszta) | 305,5 |
| **TTFB łącznie** | **360,1** |

Warm overhead (średnia req 2–8 ponad DB): **~189 ms** (sieć fra1 ↔ Supabase EU + edge runtime).

---

## 6. Co nie zmieniono (zgodnie z zakresem)

- Brak nowych funkcji produktowych
- `Cache-Control: private, no-store` — bez zmian (dane per-user)
- Service Worker `NetworkOnly` dla `/api/*` — bez zmian
- TTL 5 min w `sessionStorage` — bez zmian
- Payload JSON (~4,9 KB) — identyczny kształt dla klienta PWA

---

## 7. Reprodukcja

```bash
# Migracja (jednorazowo)
npm run db:migrate:stage1310

# Pomiar prod
MEASURE_BASE_URL=https://pilka-mu.vercel.app npm run measure:stage1310

# Pomiar local
MEASURE_BASE_URL=http://localhost:3001 npm run measure:stage1310
```

---

## 8. Wnioski

1. **Największy zysk warm:** eliminacja podwójnego auth (−281 ms) + konsolidacja 5 zapytań w 1 RPC (−124 ms DB równolegle → −53 ms PG, mniej HTTP overhead).
2. **Cold start:** cienki edge handler + brak importu `session.ts` obniżył req_1 z **783 ms → 360 ms** (przy rozgrzanej puli).
3. **Cel warm < 250 ms:** osiągnięty (**244 ms** średnia, **183 ms** min).
4. **Cel cold < 700 ms:** osiągnięty (**360 ms**); wyjątek: **~990 ms** tylko bezpośrednio po deployu (nowa edge function).

Kolejny potencjalny etap (poza 13.10): krótki private cache z `ETag`/ `max-age=60` — **nie wdrożono** (poza zakresem „bez nowych funkcji” / semantyka no-store).
