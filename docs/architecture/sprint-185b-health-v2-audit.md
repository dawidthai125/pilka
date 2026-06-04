# Sprint 18.5B — Health v2 Architecture Audit

**Date:** 2026-06-04  
**Baseline:** `d42773f` · tag `pre-18-5b-health-v2`  
**Scope:** `src/lib/platform/health.ts` and sync-related reads only  
**Constraint:** No DB changes · No Monitoring UI changes

---

## 1. Entry points

| Function | Callers |
|----------|---------|
| `computeClubHealthRows()` | `computePlatformHealthSummary()`, `loadPlatformMonitoringBundle()` |
| `computeLeagueHealthRows()` | `computePlatformHealthSummary()`, `loadPlatformMonitoringBundle()` |
| `computePlatformHealthSummary()` | `loadPlatformDashboard()` (`dashboard.ts`) |
| `loadPlatformMonitoringBundle()` | Platform monitoring page (server) |

**Out of scope (unchanged in 18.5B):** `loadSyncMonitoring()` in `monitoring.ts` — still reads `league_sync_jobs` for the “Ostatnie synchronizacje” table (UI unchanged).

---

## 2. Current query flow

### `computeClubHealthRows()`

1. **One query:** `clubs` — all rows (`id, slug, public_name, status, created_at`).
2. **Per club (N+1 loop):** `Promise.all` of:
   - `computeClubOnboardingStatus(clubId)` → **4 queries per club** (website_settings, league_sources, club_memberships, website_media count).
   - `league_sources` filtered by `club_id`.
   - `league_sync_jobs` filtered by `club_id`, `created_at >= 7d`, ordered desc.

**Query count (C clubs):** `1 + C × (4 + 1 + 1) = 1 + 6C` minimum.

### `computeLeagueHealthRows()`

1. **One query:** `league_sources` (all).
2. **One query:** `clubs` (id, slug, public_name, status).
3. **Per source (N+1 loop):** `league_sync_jobs` by `club_id` + `source_id`, limit 20.

**Query count (S sources):** `2 + S` job queries.

### `computePlatformHealthSummary()`

- `Promise.all([computeClubHealthRows(), computeLeagueHealthRows()])` — **duplicates entire club + league health work** (no shared cache).

### `loadPlatformMonitoringBundle()`

- Parallel: `loadSyncMonitoring()` + `computeClubHealthRows()` + `computeLeagueHealthRows()` — health side still **double club/league compute** inside summary if dashboard also calls summary (separate requests).

---

## 3. Direct table reads in `health.ts`

| Table | Usage |
|-------|--------|
| `clubs` | Club list + league row club metadata |
| `league_sources` | Active flag, config/provider, `last_sync_at` |
| `league_sync_jobs` | Per-club 7d jobs; per-source latest jobs + 7d error count |

**`league_sync_logs`:** **not read** anywhere in `health.ts` or `monitoring.ts`.

---

## 4. Current health scoring logic

### Club (`evaluateClubHealth`) — subtractive heuristic (base 100)

| Signal | Penalty |
|--------|---------|
| Archived | Fixed HEALTHY 100, factor only |
| Onboarding not complete | −15 |
| Active + onboarding incomplete | −20 |
| No active league source | −25 |
| ≥2 failed syncs / 7d | −30 |
| 1 failed sync / 7d | −15 |
| Last job FAIL | −25 |
| Last job WARNING | −10 |
| mirror_live + active: no sync history | −20 |
| mirror_live: sync >48h | −30 |
| mirror_live: sync >30h | −30 |
| Onboarding >14d incomplete | −15 |
| Onboarding >30d not_started | −20 |

**Level:** score ≥80 HEALTHY, ≥50 WARNING, else CRITICAL.

**Sync failure detection:** client-side `classifySyncJob()` on raw job rows (not RPC success_rate).

### League (`evaluateLeagueHealth`) — rule chain (no numeric score)

Priority rules: archived → HEALTHY; active club + inactive source → CRITICAL; last FAIL → CRITICAL; ≥2 errors/7d → CRITICAL; mirror_live stale >36h → WARNING; last WARNING → WARNING; manual_import no sync → WARNING; else HEALTHY.

### Platform summary

- Counts club/league rows by `status` and `level` only — no platform-wide freshness/latency aggregates.

---

## 5. N+1 patterns (confirmed)

| Location | Pattern |
|----------|---------|
| `computeClubHealthRows` L214–226 | Loop: onboarding + sources + jobs **per club** |
| `computeLeagueHealthRows` L311–328 | Loop: **jobs per source** |
| `computePlatformHealthSummary` | Runs club + league computes independently (2× full scan) |
| `loadPlatformMonitoringBundle` | Club + league again without shared metrics context |

---

## 6. `platform_sync_metrics` (18.5A) — target SoT

**RPC:** `platform_sync_metrics(p_club_id, p_provider, p_window_days)`  
**Returns per `club_id`:** `last_success_at`, `success_rate`, `failed_count`, `job_count`, `freshness_hours`, `avg_duration_ms`, `p95_duration_ms`, `has_running_job`.

**Existing TS helper:** `src/lib/platform/sync-metrics.ts` → `fetchPlatformSyncMetrics(pg.Client, params)` (direct SQL, service DB password).

**Provider filter:** When `p_provider` set, only jobs with matching `j.provider` are included; output still **one row per club** (not per source).

**Implication for League Health:** With **single global fetch** `(NULL, NULL, 7)`, all sources for the same club share one metrics row (club-level aggregate). Acceptable for current tenant scale (typically one active source per club). Per-source provider filter would require extra RPC calls — avoided to meet “single metrics fetch”.

---

## 7. Target architecture (18.5B)

```
connectServerDb()
  → fetchPlatformSyncMetrics(client, { windowDays: 7 })  // once
  → parallel bulk: clubs, league_sources, onboarding batch (no per-club job queries)
  → in-memory Maps
       ↓
computeClubHealthRows(ctx)
computeLeagueHealthRows(ctx)
computePlatformHealthSummary(ctx)  // uses ctx once, no re-fetch
```

### Health score (0–100)

```
health_score = freshness×0.40 + success×0.35 + latency×0.25
```

| Component | Input (RPC) | Scale |
|-----------|-------------|--------|
| Freshness | `freshness_hours` | ≤24h=100, 24–48=80, 48–72=60, 72–96=40, >96=0; null→0 |
| Success | `success_rate` (0–100) | use as score; null + job_count=0 → 100 |
| Latency | `avg_duration_ms` | <30s=100, 30–60=80, 60–120=60, 120–300=30, >300=0; null→100 |

**Level:** unchanged thresholds (80 / 50).

### Preserved row semantics (UI unchanged)

- **Club:** archived → 100 HEALTHY; onboarding/league-active still from bulk onboarding + sources; `recentFailedSyncs` ← `failed_count`; `lastSyncAt` ← `last_success_at` or source `last_sync_at`.
- **League:** structural rules (archived, active+inactive source) before score; `recentErrorCount` ← `failed_count`; `lastJobAt` ← `last_success_at`; `lastJobStatus` derived from `has_running_job` / `failed_count`.

### Removed from health path

- All `league_sync_jobs` queries in `health.ts`
- Per-club `computeClubOnboardingStatus()` calls (replaced by bulk onboarding derivation)

---

## 8. Files to change (implementation)

| File | Change |
|------|--------|
| `src/lib/platform/sync-metrics.ts` | `loadPlatformSyncMetrics()` — connect + single global fetch |
| `src/lib/platform/health.ts` | Scoring helpers, `HealthMetricsContext`, refactor three compute functions |
| `scripts/validate-185b-health-v2.mjs` | Validation (new) |
| `docs/architecture/sprint-185b-health-v2-audit.md` | This document |

**Not changed:** `monitoring.ts`, `sync-monitoring-view.tsx`, migrations, `database.ts` types (optional follow-up).

---

## 9. Risks / notes

1. **Score behavior change:** Operators will see numeric scores driven by RPC aggregates, not subtractive heuristics — expected for v2.
2. **RPC access:** PostgREST `rpc()` may lack grant; implementation uses `connectServerDb` + `fetchPlatformSyncMetrics` (same as 18.5A scripts).
3. **Club without jobs:** Freshness 0, success 100, latency 100 → score 60 (WARNING) unless archived/manual edge handling in factors.
4. **Dashboard** still triggers full health load on dashboard request — single fetch per call, not cross-request cache.

---

*Audit complete — implementation authorized.*
