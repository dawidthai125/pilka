# Sprint 18.5C — Sync History v1 Implementation Report

**Date:** 2026-06-04  
**Baseline:** `f5c68d1` + working tree  
**Audit:** `docs/architecture/sprint-185c-sync-history-v1-audit.md`

---

## Summary

Sync History v1 extends **Monitoring Center** (`/platform/monitoring`) with a paginated-style table (100 runs) sourced exclusively from **`league_sync_jobs`**, with PostgREST embedded joins for club and league labels. Client-side filters: Status, Provider, Club. Legacy “Ostatnie synchronizacje” table removed (superseded by Sync History). Health v2 logic unchanged.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/platform/sync-history.ts` | **New** — loader, mapping, labels, error truncation |
| `src/features/platform/components/sync-history-section.tsx` | **New** — client filters + table |
| `src/lib/platform/health.ts` | Bundle adds `syncHistory` + parallel `loadSyncHistory()` |
| `src/features/platform/components/sync-monitoring-view.tsx` | Cron + Health sections; Sync History at bottom |
| `scripts/validate-185c-sync-history.mjs` | **New** — static validation gate |
| `docs/architecture/sprint-185c-sync-history-v1-implementation.md` | This report |
| `docs/architecture/sprint-185c-sync-history-v1-validation.md` | Validation + query analysis |

**Unchanged:** `monitoring.ts` (cron/recent sync for cron card), migrations, RPCs, routes, Health scoring.

---

## Architecture

```
loadPlatformMonitoringBundle()
  ├─ loadHealthMetricsContext() + Health rows     (18.5B — unchanged)
  ├─ loadSyncMonitoring()                         (cron card — 2 queries)
  └─ loadSyncHistory()                            (1 query + embeds)
         ↓
SyncMonitoringView
  ├─ Cron card
  ├─ Club / League Health
  └─ SyncHistorySection (client filters)
```

---

## Column mapping

| UI | Source |
|----|--------|
| Started | `started_at` ?? `created_at` |
| Provider | `provider` + label map |
| Trigger | `trigger_source` + label map |
| Status | `status` + `SyncCategoryBadge` |
| Duration | `duration_ms` or computed |
| Club | `clubs.slug`, `clubs.public_name` |
| League | `league_competitions.name` → fallback `league_sources.name` |
| Last Error | `error_message` truncated to 72 chars |

---

## Out of scope (confirmed)

Operations module, log drawer, retry/re-run, new RPC/tables, `platform_sync_metrics` for rows.

---

*Implementation complete — commit on operator request.*
