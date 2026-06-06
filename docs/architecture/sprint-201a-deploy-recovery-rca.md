# Sprint 20.1 — Deploy Recovery RCA

**Data:** 2026-06-06  
**Priorytet:** P0  
**Commit zepsuty:** `ed324b7` (build FAIL na Vercel)  
**Fix commit:** `eb29e7a` — `fix(platform): split client-safe health types for Vercel build (deploy recovery)`  
**Prod LIVE:** `eb29e7a` · https://pilka-mu.vercel.app

---

## Symptom

Vercel build `npm run build` failed:

```
Module not found: Can't resolve 'net' / 'tls'
Import trace:
  monitoring-interactive.tsx
  → health.ts
  → sync-metrics.ts
  → server-client.ts
  → pg
```

Produkcja pozostała na `4311404` (ostatni udany deploy).

---

## Root cause

1. **`monitoring-interactive.tsx`** (`"use client"`) importował **wartość** `MONITORING_HEALTH_PAGE_SIZE_OPTIONS` z `@/lib/platform/health`.
2. **`health.ts`** to moduł **server-only** — importuje `loadPlatformSyncMetrics` → `connectServerDb` → **`pg`** (Node.js `net`/`tls`).
3. Webpack/Next przy bundlowaniu client component **wczytuje cały moduł** przy value import — `import type` jest bezpieczny, value import nie.
4. Ten sam wzorzec latentny w **`club-operations-registry.tsx`** → value import `REGISTRY_PAGE_SIZE_OPTIONS` z loadera registry.

**Dlaczego `ed324b7` ujawnił problem:** Sprint 20.1 nie wprowadził pierwszego błędu — `351b424` też failował z tym samym trace. Prod utknął na `4311404` od deployu sprzed 19.3B.

---

## Minimalna poprawka (bez zmiany logiki)

Wydzielenie **client-safe** typów i stałych:

| Plik | Zawartość |
|------|-----------|
| `health-types.ts` | Typy Health v2 + stałe paginacji monitoring |
| `club-operations-registry-types.ts` | Typy registry + stałe paginacji |

Client components importują wyłącznie z `*-types.ts`.  
Loadery server (`health.ts`, `club-operations-registry.ts`) re-eksportują typy dla kompatybilności.

**Bez zmian:** Health v2 scoring, Alerts evaluator, Lifecycle, Monitoring UX.

### Reguła dla przyszłych agentów

| Kontekst | Importuj z |
|----------|------------|
| `"use client"` — typy Health / stałe paginacji monitoring | `@/lib/platform/health-types` |
| `"use client"` — typy Registry / stałe paginacji | `@/lib/platform/club-operations-registry-types` |
| Server loaders / RSC pages | `@/lib/platform/health`, `club-operations-registry` |

**Nigdy** nie rób value importu z `health.ts` w komponencie klienckim — moduł ciągnie `pg`.

---

## Weryfikacja

```bash
npm run build  # PASS (lokalnie 2026-06-06)
# Vercel: Ready (eb29e7a)
```

---

## Pliki zmienione

- `src/lib/platform/health-types.ts` (nowy)
- `src/lib/platform/club-operations-registry-types.ts` (nowy)
- `src/lib/platform/health.ts`
- `src/lib/platform/club-operations-registry.ts`
- `src/lib/platform/platform-alerts.ts`
- `src/features/platform/components/monitoring-interactive.tsx`
- `src/features/platform/components/platform-status-badges.tsx`
- `src/features/platform/components/sync-monitoring-view.tsx`
- `src/features/platform/components/club-operations-registry.tsx`
