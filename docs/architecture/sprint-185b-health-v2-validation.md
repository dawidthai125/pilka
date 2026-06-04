# Sprint 18.5B — Health v2 Validation Report

**Date:** 2026-06-04  
**Baseline:** `d42773f` → working tree (18.5B implementation)

---

## Automated checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `node scripts/validate-185b-health-v2.mjs` | PASS |
| `health.ts` contains no `league_sync_jobs` | PASS |
| `health.ts` contains no `league_sync_logs` | PASS |
| Live `platform_sync_metrics(NULL, NULL, 7)` | PASS (2 club rows) |

---

## Architecture acceptance

| Criterion | Status |
|-----------|--------|
| `computeClubHealthRows` uses RPC only (via `loadPlatformSyncMetrics`) | ✅ |
| `computeLeagueHealthRows` uses same context (no extra sync queries) | ✅ |
| `computePlatformHealthSummary` single `loadHealthMetricsContext` | ✅ |
| No new tables / views / RPCs | ✅ |
| Monitoring UI unchanged | ✅ |
| Single metrics fetch per health load | ✅ |
| In-memory aggregation (clubs, sources, onboarding batch) | ✅ |

---

## Scoring verification (unit)

| Input | Expected component | Result |
|-------|-------------------|--------|
| freshness 12h | 100 | ✅ |
| freshness 36h | 80 | ✅ |
| freshness 100h | 0 | ✅ |
| success 95% / 10 jobs | 95 | ✅ |
| success null / 0 jobs | 100 | ✅ |
| latency 25s | 100 | ✅ |
| latency 45s | 80 | ✅ |
| composite (10h, 100%, 20s avg) | ≥95 | ✅ |

---

## Manual smoke (operator)

1. `/platform/monitoring` — Club Health + League Health tables render (no layout change).
2. `/platform` dashboard — KPI health counts still load (`computePlatformHealthSummary`).
3. Compare scores vs pre-18.5B: expect RPC-driven 0–100 (freshness/success/latency weights).

---

## Notes

- `loadSyncMonitoring()` still reads `league_sync_jobs` for the sync history table — intentional (UI scope).
- `manual_import` clubs with zero jobs: club score pinned to **100** (no false CRITICAL from missing freshness).
- League rows for the same club share one RPC aggregate (club-level); see audit §6.

---

*Validation complete — ready for commit on operator request.*
