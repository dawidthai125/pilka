# Sprint 18.5C — Sync History v1 Architecture Audit

**Date:** 2026-06-04  
**Type:** Architecture audit only (no implementation)  
**Baseline:** `d42773f` · tag `pre-18-5b-health-v2`  
**Prior sprints:** 18.5A (sync foundation + `platform_sync_metrics`) · 18.5B (Health v2 — design/docs; may be uncommitted on `main`)

**Constraint:** No code, migrations, RPCs, tables, or UI in this sprint.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Can Sync History v1 be built without new DB objects? | **Yes** — primary source is `league_sync_jobs` |
| Are `league_sync_logs` required for v1 list? | **No** — optional for drill-down / failure diagnosis |
| Is `platform_sync_metrics` the history source? | **No** — aggregates only (Health/KPI), not per-run rows |
| New Operations module needed? | **No** — extend **Monitoring Center** (`/platform/monitoring`) |
| Recommendation | **GO** for Sync History v1 (jobs-only list + optional log drawer in v1.1) |

---

## 1. Data inventory

### 1.1 `league_sync_jobs` (canonical Sync Run registry)

**Role (approved architecture):** One row = one sync execution (import or mirror pipeline run).

| Column | Type | History use |
|--------|------|-------------|
| `id` | UUID PK | Row key, link to logs |
| `club_id` | UUID FK → `clubs` | Club column, filter |
| `source_id` | UUID FK → `league_sources` (nullable) | Source / setup context |
| `competition_id` | UUID FK → `league_competitions` (nullable) | **League** display name via join |
| `import_type` | `league_import_type` | Secondary label (`full`, `fixtures`, …) |
| `status` | `league_sync_status` | **Status** (`pending`, `running`, `completed`, `failed`, `cancelled`) |
| `records_processed` | int | Optional detail column |
| `records_failed` | int | Failure signal |
| `records_conflicts` | int | Optional detail |
| `error_message` | text | Failure diagnosis (list + tooltip) |
| `started_at` | timestamptz | **Started** (preferred) |
| `completed_at` | timestamptz | End time |
| `created_at` | timestamptz | Fallback start, sort key |
| `triggered_by` | UUID → `profiles` (nullable) | Actor (club user); not platform email |
| `metadata` | jsonb | Pipeline context (`adapter`, `sources`, conflicts, `activatedVia`, …) — not normalized |
| **`provider`** | text (18.5A) | **Provider** — `mirror_live` \| `manual_import` \| `unknown` |
| **`trigger_source`** | text (18.5A) | **Trigger** — `cron` \| `platform_admin` \| `club_user` \| `import` \| `cli` \| `unknown` |
| **`duration_ms`** | int (18.5A) | **Duration** (backfilled from timestamps if null) |

**Timestamps:** `started_at` / `completed_at` / `created_at` — all UTC (`timezone('utc', now())` in schema).

**Status semantics:** Enum at DB level; UI category (`PASS` / `WARNING` / `FAIL`) today computed in `classifySyncJob()` from status + `records_failed` + `error_message` (not stored).

**Instrumentation (18.5A+):** Live pipeline sets `provider`, `trigger_source`, `duration_ms` on insert/update (`scripts/lib/league-live-pipeline.mjs`). Platform league activation inserts jobs with `trigger_source = platform_admin`. Older rows backfilled in migration `20260704120000_sprint_185a_league_sync_foundation.sql`.

**Relations:**

- **Club:** `club_id` → `clubs.slug`, `clubs.public_name`
- **League (display):** `competition_id` → `league_competitions.name` (per-club competition record)
- **Source config:** `source_id` → `league_sources.name` (operator-friendly label; config JSON may duplicate `provider`)

---

### 1.2 `league_sync_logs` (diagnostics layer only)

| Column | Type | History use |
|--------|------|-------------|
| `id` | UUID PK | — |
| `job_id` | UUID FK → `league_sync_jobs` ON DELETE CASCADE | Parent run |
| `club_id` | UUID FK → `clubs` | RLS / consistency |
| `level` | text (default `info`) | Severity filter |
| `message` | text | Human-readable pipeline step |
| `metadata` | jsonb | Optional structured detail |
| `created_at` | timestamptz | Log ordering |

**Volume:** Many rows per job (pipeline steps: tabela, mecze, kadra, errors). Written from `league-live-pipeline.mjs`, `import-league-fixture.mjs`, `src/lib/league/sync.ts`.

**Not suitable as primary history table:** No `provider` / `trigger` / `duration`; duplicate club_id; requires join to jobs for run-level view.

**Best use:** Expand row → “Diagnostics” panel (WHY ingest step failed), not main grid.

---

### 1.3 `platform_sync_metrics` RPC (metrics layer)

**Signature:** `platform_sync_metrics(p_club_id, p_provider, p_window_days)` → **one row per club** (aggregated).

| Output | Meaning |
|--------|---------|
| `last_success_at` | Last clean completed job |
| `success_rate` | % terminal jobs successful |
| `failed_count` / `job_count` | Window counts |
| `freshness_hours` | Hours since last success |
| `avg_duration_ms` / `p95_duration_ms` | Latency aggregates |
| `has_running_job` | Pending/running in last 2h |

**Source:** Reads `league_sync_jobs` only (7–90 day window).

**Not a history API:** No job ids, no ordering, no per-run status timeline. **Correct layer for Health v2 scores; wrong layer for Sync History list.**

---

## 2. Sync History feasibility

### 2.1 Jobs only — **sufficient for v1 list**

Proposed columns map 1:1 to existing data:

| UI column | Source |
|-----------|--------|
| Started | `started_at` ?? `created_at` |
| Provider | `provider` |
| Trigger | `trigger_source` |
| Status | `status` (+ optional `SyncCategoryBadge` via `classifySyncJob`) |
| Duration | `duration_ms` ?? computed `completed_at - started_at` |
| Club | join `clubs` |
| League | join `league_competitions.name` on `competition_id` (fallback: `league_sources.name` or `import_type`) |

**No new tables, RPCs, or materialized views required.**

### 2.2 Jobs + logs — **recommended for diagnosis, not v1 grid**

| Capability | Jobs only | + Logs |
|------------|-----------|--------|
| Paginated run list | ✅ | ✅ (same list) |
| Failed sync summary | ✅ (`error_message`, `records_failed`) | ✅ |
| Step-level failure (tabela vs mecze) | ❌ | ✅ |
| Extra queries | 2–3 | +1 on expand or batch by `job_id` |

**Recommendation:** Ship **v1 list on jobs**; add **v1.1 log drawer** without schema changes.

### 2.3 What not to use

| Source | Reason |
|--------|--------|
| `platform_sync_metrics` | Aggregates — cannot render history rows |
| `metadata` alone | Rich but inconsistent; use as optional tooltip, not columns |
| Club `/league` UI loaders | Tenant-scoped + RLS; Platform must use **service role** (`createAdminClient`) like `monitoring.ts` |

---

## 3. UX scope proposal — Sync History v1 (minimal)

**Placement:** New section on existing `/platform/monitoring` — **“Sync History”** (below or replace “Ostatnie synchronizacje” with a richer table). No new route required for v1; optional `?tab=history` later.

**Default view:** Last **50** runs, all clubs (platform operator), sorted `created_at DESC`.

| Column | Notes |
|--------|-------|
| Started | `formatPlatformDate(started_at ?? created_at)` |
| Provider | Badge: `mirror_live` / `manual_import` / `unknown` |
| Trigger | Badge: cron, platform_admin, … |
| Status | Raw status + category badge |
| Duration | `formatDurationMs(duration_ms)` |
| Club | Link `/platform/clubs/{id}` |
| League | `competition.name` or `—` |
| (optional) Errors | Truncated `error_message` |

**Filters (server-side query params):**

| Filter | Column | Index support |
|--------|--------|---------------|
| Club | `club_id` | `league_sync_jobs_club_idx`, `club_status_created_idx` |
| Status | `status` | `club_status_created_idx` when combined with club |
| Provider | `provider` | Seq scan OK at current scale; optional future index |
| Trigger | `trigger_source` | Same |
| Date from / to | `created_at` | `league_sync_jobs_created_at_idx` |
| Category (PASS/WARN/FAIL) | Derived client-side or filter status + error fields | Partial |

**Sorting:** Default `created_at DESC`; optional `duration_ms DESC`, `status` (low cardinality).

**Pagination:**

- **v1:** Offset/limit via Supabase `.range(from, to)` — page size 25–50.
- **v2 (if volume grows):** Keyset `(created_at, id) < cursor`.

**Drill-down (v1.1, no new tables):** Click row → side panel with `league_sync_logs` for `job_id` ordered by `created_at ASC` (pattern exists: `getLeagueSyncLogs` in `src/lib/league/loaders.ts`).

**Explicitly out of v1:** SQL console, log export, replay, cross-tenant analytics, new `/platform/operations` module.

---

## 4. Query strategy review

### 4.1 Current path (`loadSyncMonitoring`)

| Step | Query |
|------|--------|
| 1 | `clubs` — all ids/names |
| 2 | `league_sync_jobs` — last 50 global, **without** `provider`, `trigger_source`, `duration_ms`, joins |

**Count:** 2 queries · **No N+1** · Limited to 50 rows · Not a full “history” UX.

**Page load (`loadPlatformMonitoringBundle`):** Adds Health v2 context (post-18.5B): 1× RPC metrics + bulk clubs/sources/onboarding + `loadSyncMonitoring` — health path must stay separate from history list to avoid duplicating 50-job fetch.

### 4.2 Recommended path (Sync History v1)

```
createAdminClient()
  ├─ (optional) count query with same filters — 1 query
  └─ league_sync_jobs
        .select(`…, club:clubs(...), competition:league_competitions(name), source:league_sources(name)`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
        [filters: club_id, status, provider, trigger_source, gte/lte created_at]
```

**Expected query count per page load:**

| Scenario | Queries |
|----------|---------|
| History section only (embedded in monitoring) | **1–2** |
| History + existing cron/health bundle | **+1–2** (do not re-fetch health metrics for history) |
| Row expand with logs (v1.1) | **+1** batch `logs WHERE job_id IN (...)` for visible selection |

**N+1 risk:** **Low** if joins via PostgREST embed; **avoid** per-row log fetch in a loop.

### 4.3 Indexes (existing)

| Index | Migration | Supports |
|-------|-----------|----------|
| `league_sync_jobs_club_idx` | 15B | `(club_id, created_at DESC)` — club filter + sort |
| `league_sync_logs_job_idx` | 15B | `(job_id, created_at)` — log drill-down |
| `league_sync_jobs_created_at_idx` | **18.5A** | Global history sort / date range |
| `league_sync_jobs_club_status_created_idx` | **18.5A** | Club + status filter + sort |

**Gap (non-blocking):** No composite `(provider, created_at DESC)` or `(trigger_source, created_at DESC)` — acceptable while job count ≪ 10k.

**RLS:** Platform page uses **service role** — bypasses `actor_can_read_league`. Do not reuse club-dashboard loaders without admin client.

---

## 5. Operations readiness

| Question | Assessment |
|----------|------------|
| Explain **why Health score dropped**? | **Partially.** Health v2 (18.5B) exposes aggregate factors (freshness, success %, latency). History shows **which runs** failed and when — operator correlates time window. Direct “score delta” link is **UX-only** (filter jobs to club + last 7d), no new RPC. |
| Diagnose **failed syncs**? | **Yes (jobs).** `error_message`, `status`, `records_failed`, `provider`, `trigger_source`. **Better with logs** for step-level root cause (ingest vs squad). |
| Without **Operations** module? | **Yes.** Extend Monitoring Center; aligns with product rule “no Operations module”. |

**Correlation Health ↔ History:**

| Health signal (RPC) | History evidence |
|-------------------|------------------|
| Low freshness | Recent rows with old `last_success` / stale completed jobs |
| Low success_rate | Filter `status = failed` or high `records_failed` |
| High latency | Sort by `duration_ms DESC` |
| `has_running_job` | Row `status IN (pending, running)` |

---

## 6. Recommended architecture

```
/platform/monitoring
  ├─ Cron card                    (existing)
  ├─ Club / League Health         (18.5B — platform_sync_metrics)
  ├─ Sync History v1  [NEW]       ← league_sync_jobs (+ joins)
  │     └─ optional Log drawer    ← league_sync_logs (v1.1)
  └─ (deprecate or merge)         “Ostatnie synchronizacje” → History table
```

**Data flow:**

```
league_sync_jobs (+ clubs, competitions, sources)
        ↓
src/lib/platform/sync-history.ts   (new loader — implementation sprint)
        ↓
SyncMonitoringView section          (extend, no new app module)
```

**Do not use** `platform_sync_metrics` for the history grid.

---

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pre-18.5A rows missing `provider` / `trigger_source` | Medium | Migration backfill + show `unknown`; tooltip from `metadata` |
| `platform_sync_metrics` REVOKED FROM PUBLIC | Low | History does not use RPC; admin client uses service role / direct SQL if needed |
| Duplicate UI: “Ostatnie synchronizacje” vs “Sync History” | Low | Merge into one table in implementation sprint |
| Log volume per job | Low | Load logs on demand, limit 200 lines |
| PostgREST embed FK names | Low | Verify relationship names in `database` types / Supabase schema |
| 18.5B not on `main` / tag `pre-18-5c` on 18.5A only | Medium | Implement history after Health v2 commit; no dependency conflict |
| Offset pagination drift | Low | Keyset later if >5k jobs |

---

## 8. Estimated implementation scope

| Work item | Effort |
|-----------|--------|
| `loadSyncHistory()` + types | S (0.5d) |
| Extend `SyncMonitoringView` — table + filters (URL searchParams) | M (1d) |
| Wire into `loadPlatformMonitoringBundle` or parallel load | S (0.25d) |
| Log drawer (v1.1 optional) | S (0.5d) |
| Validation script `validate-185c-sync-history.mjs` | S (0.25d) |
| `npm run typecheck` + manual smoke `/platform/monitoring` | S (0.25d) |

**Total:** ~**1.5–2.5 dev days** (v1 list only); **+0.5d** with log drawer.

**Out of scope:** New migrations, RPCs, routes, Operations module, public/dashboard changes.

---

## 9. Go / No-Go

### **GO** — Sync History v1

**Conditions:**

1. Implement as **Monitoring Center extension** only.
2. **Primary data:** `league_sync_jobs` with joins; **no new DB objects**.
3. **Do not** build list from `platform_sync_metrics`.
4. **v1** = paginated operator table with 18.5A columns; **v1.1** = optional `league_sync_logs` drill-down.
5. Commit **18.5B** (Health v2) before or with 18.5C to avoid conflicting `health.ts` / monitoring bundle work.

**No-Go triggers (none apply today):** Missing jobs table, missing club FK, or requirement for immutable audit store separate from jobs — not required for v1.

---

## 10. References

| Artifact | Path |
|----------|------|
| 18.5A migration | `supabase/migrations/20260704120000_sprint_185a_league_sync_foundation.sql` |
| 15B schema | `supabase/migrations/20260618120000_stage15b_league_hub.sql` |
| Monitoring loader | `src/lib/platform/monitoring.ts` |
| Job mapper | `src/lib/league/mappers.ts` → `mapLeagueSyncJob` |
| Club league history | `src/lib/league/loaders.ts` → `getLeagueSyncJobs`, `getLeagueSyncLogs` |
| Health v2 audit | `docs/architecture/sprint-185b-health-v2-audit.md` |
| Platform admin | `docs/ai/10-platform-admin-multi-club.md` |

---

*Audit complete — implementation not authorized in Sprint 18.5C.*
