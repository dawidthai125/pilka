# Sprint 20.1 — Platform Performance P1 (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-201a-platform-performance-p1.mjs
node scripts/validate-193b-saas-readiness-p0.mjs
node scripts/validate-192b-lifecycle-hardening.mjs
node scripts/validate-191a-club-attention-dashboard.mjs
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Przed retencją sync jobs w produkcji

Zastosuj na Supabase (jednorazowo lub pg_cron weekly):

```bash
psql $DATABASE_URL -f scripts/sql/hotfix-201a-sync-jobs-retention.sql
# opcjonalnie: SELECT public.platform_prune_league_sync_jobs(90);
```

---

## Wynik (lokalnie, 2026-06-05)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `validate-201a-platform-performance-p1.mjs` | **PASS** |
| `validate-193b-saas-readiness-p0.mjs` | **PASS** |
| `validate-192b-lifecycle-hardening.mjs` | **PASS** |
| `validate-191a-club-attention-dashboard.mjs` | **PASS** |
| `validate-190b-club-operations-registry.mjs` | **PASS** |
| `validate-186b-platform-alerts.mjs` | **PASS** |
| `validate-185b-health-v2.mjs` | **PASS** (live RPC: 2 kluby) |
| `validate-185c-sync-history.mjs` | **PASS** |

---

## Asercje P1 (`validate-201a`)

| ID | Asercja | Status |
|----|---------|--------|
| P1-1 | `health.ts`: `import { cache } from "react"` + `cache(loadHealthMetricsContextImpl)` | ✅ |
| P1-1 | Monitoring bundle: `loadSyncMonitoring(50, clubLookup)` | ✅ |
| P1-2 | Dashboard: brak `clubsAuditRes`, brak osobnego leagues count | ✅ |
| P1-2 | Dashboard: `buildSyncMonitoringData` + `countActiveLeagues` | ✅ |
| P1-3 | `club-bootstrap.ts`: `profiles` lookup, brak `listUsers` | ✅ |
| P1-4 | Brak `listPlatformClubs` / `fetchPlatformClubs` | ✅ |
| P1-5 | SQL: `platform_prune_league_sync_jobs` | ✅ |

---

## Smoke (manual, zalecane przed deploy)

1. **Dashboard** `/platform` — KPI active leagues, recent syncs (10), recent actions (15) bez regresji.
2. **Monitoring** `/platform/monitoring` — cron card, sync table, health pagination bez zmian.
3. **Create club** z nowym owner email — invite flow; z istniejącym profilem — membership `active`.
4. **Registry** `/platform/clubs` — paginacja i filtry bez regresji.

---

## Before / After — podsumowanie walidacji

| Obszar | Before (post-19.3B) | After (20.1) | Walidacja |
|--------|---------------------|--------------|-----------|
| Dashboard queries | ~10–11 | ~7 | Źródła + typecheck PASS |
| Health context / request | N× jeśli zagnieżdżone | max 1× (`React.cache`) | Asercja cache PASS |
| Monitoring clubs fetch | 2× (context + sync) | 1× (reuse lookup) | Asercja clubLookup PASS |
| Owner create Auth | `listUsers(1000)` | 1× profiles | Asercja PASS |
| Legacy N+1 list | `fetchPlatformClubs` | usunięte | Asercja PASS |
| Sync jobs DB growth | niekontrolowany | hotfix 90d (manual apply) | SQL plik PASS |

---

## SaaS Readiness — werdykt po 20.1

| Skala | 20.0A | Po 20.1 |
|-------|-------|---------|
| 20 | GO | **GO** |
| 50 | GO | **GO** |
| 100 | GO warunkowy | **GO** (po apply hotfix retention na prod) |
| 500 | NO-GO | **NO-GO** |

**Uwaga:** Hotfix `hotfix-201a-sync-jobs-retention.sql` — **PASS na prod** (2026-06-06). Patrz [sprint-201a-finalization.md](./sprint-201a-finalization.md).

---

## Deploy Recovery (2026-06-06)

| Check | Wynik |
|-------|--------|
| `ed324b7` Vercel build | **FAIL** (pg w client bundle) |
| `eb29e7a` fix + `npm run build` | **PASS** |
| Vercel prod deploy | **PASS** (`eb29e7a`) |
| https://pilka-mu.vercel.app/platform/monitoring | **200** |

RCA: [sprint-201a-deploy-recovery-rca.md](./sprint-201a-deploy-recovery-rca.md)
