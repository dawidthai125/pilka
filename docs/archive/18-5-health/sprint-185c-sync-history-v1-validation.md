# Sprint 18.5C — Sync History v1 Validation Report

**Date:** 2026-06-04

---

## Automated checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `node scripts/validate-185c-sync-history.mjs` | PASS |
| `node scripts/validate-185b-health-v2.mjs` | PASS (Health unchanged) |
| `sync-history.ts` avoids `platform_sync_metrics` | PASS |
| `sync-history.ts` avoids `league_sync_logs` | PASS |

---

## Query count analysis

### Per `/platform/monitoring` request

| Loader | Queries | Notes |
|--------|---------|-------|
| `loadHealthMetricsContext` | 1× RPC via pg + 3× Supabase bulk | Health v2 (unchanged) |
| `loadSyncMonitoring` | 2 | `clubs` + `league_sync_jobs` limit 50 (cron only) |
| **`loadSyncHistory`** | **1** | `league_sync_jobs` + embed `clubs`, `league_competitions`, `league_sources` |
| **Sync History subtotal** | **1** | Target met |
| **Page total (parallel)** | **~6** | Health dominates; History adds **+1** |

### N+1 assessment

| Pattern | Status |
|---------|--------|
| Per-row club fetch | None |
| Per-row league fetch | None |
| Per-row log fetch | None (v1) |
| PostgREST embed | Single round-trip for 100 jobs |

**Indexes used:** `league_sync_jobs_created_at_idx` (ORDER BY `created_at DESC`), existing `league_sync_jobs_club_idx` when club filter applied client-side only (in-memory).

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Sync History on `/platform/monitoring` | ✅ |
| Below Health sections | ✅ |
| Columns: Started, Provider, Trigger, Status, Duration, Club, League, Last Error | ✅ |
| Filters: Status, Provider, Club (client) | ✅ |
| Sort: Started DESC (server order preserved) | ✅ |
| No new DB objects / RPCs | ✅ |
| No Operations module | ✅ |
| Health v2 unchanged | ✅ |

---

## UI screenshots

Automated browser capture was not run (platform admin login required). **Operator checklist:**

1. Log in as platform admin → open `/platform/monitoring`.
2. Scroll below **Club Health** / **League Health**.
3. Capture **full-width** screenshot showing:
   - **Sync History** heading
   - Filter row (Status / Provider / Klub)
   - Table with columns through **Last Error**
4. Capture second screenshot with **Provider = mirror_live** (or one club) filter applied.

### Wireframe (reference layout)

```
┌─ Monitoring ─────────────────────────────────────────────┐
│ [Cron ligowy card]                                       │
│ CLUB HEALTH table                                        │
│ LEAGUE HEALTH table                                      │
│ SYNC HISTORY                    N / 100 runów · Started ↓│
│ [Status ▼] [Provider ▼] [Klub ▼]                       │
│ ┌────────┬─────────┬─────────┬────────┬───────┬──────┐ │
│ │Started │Provider │Trigger  │Status  │Duration│Club │…│
│ └────────┴─────────┴─────────┴────────┴───────┴──────┘ │
└──────────────────────────────────────────────────────────┘
```

Save captures as e.g. `docs/architecture/screenshots/185c-monitoring-sync-history.png` when verifying on prod/staging.

---

## Manual smoke

- [ ] `/platform/monitoring` loads without error
- [ ] Sync History shows ≥1 row on prod (if jobs exist)
- [ ] Filters reduce visible rows
- [ ] Last Error truncates with full text in `title` tooltip
- [ ] Club link opens `/platform/clubs/{id}/league`

---

*Validation complete.*
