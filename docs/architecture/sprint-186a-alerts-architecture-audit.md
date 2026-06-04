# Sprint 18.6A — Alerts Architecture Audit

**Date:** 2026-06-04  
**Type:** Architecture audit only (no implementation)  
**Baseline tag:** `pre-18-6-alerts-foundation` → commit `6b291b1` (18.5D)  
**Prior platform sprints:** 18.5A Metrics · 18.5B Health v2 · 18.5C Sync History · 18.5D Monitoring UX  

**Constraint:** No code, migrations, RPCs, tables, UI, commit, or deploy.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Is FC OS ready for an Alerts layer? | **Yes — GO for v1 (computed alerts)** |
| Canonical data | `league_sync_jobs` → `platform_sync_metrics` → Health v2 |
| New tables required for v1? | **No** (recommended) |
| New RPC required for v1? | **No** (reuse `platform_sync_metrics` + in-memory rules) |
| Best first surface | **Monitoring Center** (extend, not Operations module) |
| Persistence | **Defer** — start with on-demand evaluation; add DB only if ack/history needed |

---

## 1. Architecture inventory (current)

```
league_sync_jobs          ← Sync Run registry (per execution)
        ↓
platform_sync_metrics()   ← Aggregates 7–90d / club (+ optional provider filter)
        ↓
Health v2 (health.ts)     ← score 0–100, level HEALTHY|WARNING|CRITICAL
        ↓
Monitoring Center       ← Cron + Club/League Health + Sync History + UX filters
Platform Dashboard      ← KPI counts + platformHealth summary (re-fetches health)
```

| Layer | Role for alerts |
|-------|-----------------|
| `league_sync_jobs` | Evidence rows (last error, status, provider, trigger, duration) — **diagnosis**, not primary evaluator |
| `platform_sync_metrics` | **Primary signal** — freshness, success_rate, failed_count, avg/p95 duration, has_running_job |
| Health v2 | **Normalized club-level verdict** — already maps metrics → score + level + factors |
| Sync History | Operator drill-down after alert (18.5D linking) |
| `notification_events` | Club-user in-app comms (Stage 15.6) — **not** platform-operator alerts today |
| `clubs.settings.platformAudit` | Human actions audit — not automated alerts |

**Query budget today (`/platform/monitoring`):** ~6 parallel loads (1× pg RPC metrics + 3× Supabase bulk health + 2× monitoring cron + 1× sync history). Alerts v1 should **piggyback** `loadHealthMetricsContext()` — **+0 queries** if computed in-process.

---

## 2. Alert catalog

Difficulty: **S** ≤0.5d · **M** ~1d · **L** >2d (needs new data or channels)

| ID | Alert | Source | Detection (v1) | Difficulty |
|----|-------|--------|----------------|------------|
| A1 | **Club health CRITICAL** | Health v2 `ClubHealthRow.level` | `level === 'CRITICAL'` (score &lt; 50) | **S** |
| A2 | **Club health WARNING** | Health v2 | `level === 'WARNING'` (50–79) | **S** |
| A3 | **League source unhealthy** | `LeagueHealthRow.level` | `level IN ('WARNING','CRITICAL')` | **S** |
| A4 | **Freshness stale (mirror)** | RPC `freshness_hours` + club `active` + provider | `freshness_hours > 48` (mirror_live clubs) | **S** |
| A5 | **No successful sync in window** | RPC `last_success_at`, `job_count` | `job_count > 0` AND `last_success_at IS NULL` OR `freshness_hours` null with active mirror | **S** |
| A6 | **Success rate degraded** | RPC `success_rate`, `failed_count` | `success_rate < 80` AND `job_count >= 3` | **S** |
| A7 | **Consecutive / cluster failures** | RPC `failed_count` or jobs | `failed_count >= 2` in 7d (proxy for series) | **S** |
| A8 | **Last run failed** | `league_sync_jobs` latest per club OR metrics | Latest job `status=failed` OR `failed_count` spike with low success | **M** (needs latest job if not inferable from RPC alone) |
| A9 | **Slow sync (latency)** | RPC `avg_duration_ms` / `p95_duration_ms` | `p95_duration_ms > 120000` OR `avg_duration_ms > 60000` | **S** |
| A10 | **Very slow sync (critical latency)** | RPC | `p95_duration_ms > 300000` or avg &gt; 300s | **S** |
| A11 | **Stuck running job** | RPC `has_running_job` | `has_running_job === true` for &gt;2h (RPC already scopes 2h) | **S** |
| A12 | **Provider mirror_live unhealthy** | RPC with `p_provider=mirror_live` OR filter jobs | Aggregate: any active club with mirror failures / stale freshness | **M** (optional 2nd RPC call per provider) |
| A13 | **Provider manual_import idle** | `league_sources.last_sync_at` + jobs | Active manual source, no `last_sync_at`, `job_count=0` | **S** (already in Health factors) |
| A14 | **Cron / platform-wide stale** | `loadSyncMonitoring().cron` | Cron card FAIL/WARNING (36h no success) | **S** |
| A15 | **Active club, no league source** | Health factors / `leagueActive` | `!leagueActive` && `status === 'active'` | **S** |
| A16 | **Onboarding blocked** | Onboarding + club status | `onboarding !== complete'` on active club (INFO/WARNING) | **S** |
| A17 | **Records failed but completed** | Jobs / Sync History | `status=completed` AND `records_failed > 0` (WARNING ingest) | **M** (job-level scan or extend RPC) |
| A18 | **Error message on last job** | `league_sync_jobs.error_message` | Latest failed job with non-null error | **M** (1 lightweight job query or history head) |

**Not available without new instrumentation:**

| Alert | Gap |
|-------|-----|
| SLA per competition | No SLA table |
| Cross-club anomaly ML | Out of scope |
| External webhook delivery audit | No delivery log |
| Alert ack / mute per operator | No platform_alerts table |

---

## 3. Storage model comparison

### A. Computed on demand (evaluate at read or cron tick)

**Flow:** Load metrics once → run pure functions → return `PlatformAlert[]` in memory.

| Pros | Cons |
|------|------|
| No migration, no new RLS | No historical “when did it fire?” |
| Always consistent with Health v2 | Re-computed every page load |
| Zero storage cost | No acknowledge / suppress |
| Fits 18.5A–18.5D architecture | Dedup across refreshes manual |
| **+0 DB objects** | Email/webhook needs separate dispatch log eventually |

### B. Persisted in database (`platform_alerts` or similar)

| Pros | Cons |
|------|------|
| History, ack, mute | New table + RLS + migrations |
| Cron can insert once | Risk of duplicating Health semantics |
| Email/webhook from stable IDs | Sync with computed rules (drift) |
| Audit trail for compliance | More operator UI (inbox) |

### Recommendation

**Phase 1 (18.6B): Approach A — computed alerts**

- Implement `evaluatePlatformAlerts(ctx: HealthMetricsContext, clubHealth, leagueHealth, cron?)` in TS.
- Reuse **single** `platform_sync_metrics(NULL, NULL, 7)` already loaded for Health.
- Optional: one global “latest failed job” query only if A8/A18 required (accept +1 query).

**Phase 2 (later): Hybrid**

- Persist only **state transitions** (OPEN → RESOLVED) or **dispatched notifications**, not re-store full metrics.
- Avoid duplicating `league_sync_jobs` content in alert rows — store `alert_type`, `club_id`, `severity`, `fingerprint`, `opened_at`, `resolved_at`, `metadata` JSON.

**Do not** start with B unless product requires ack/history in 18.6.

---

## 4. Presentation — rollout order

| Priority | Surface | Rationale | Effort |
|----------|---------|-----------|--------|
| **1** | **Monitoring Center** — Alerts panel above or below Health | Operators already triage here; links to Sync History (18.5D) | M |
| **2** | **Platform Dashboard** — compact alert summary (counts + top 3) | Landing visibility; reuse same evaluator | S |
| **3** | **In-app (platform admin)** | Banner on `/platform/*` when CRITICAL &gt; 0 | M |
| **4** | **E-mail** (`PLATFORM_ADMIN_EMAILS`) | Daily digest or CRITICAL immediate — needs template + idempotency | L |
| **5** | **Webhook** | External PagerDuty/Slack — needs signing, retry, secrets | L |

**Not recommended first:** Club dashboard `notification_events` (wrong audience — coaches/parents, not platform ops).

**UI pattern (v1):** List grouped by severity → click → apply existing Sync History filters (`filtersFromClub` / `filtersFromLeague`).

---

## 5. Severity model (INFO / WARNING / CRITICAL)

Align with existing `HealthLevel` and `SyncCategory` where possible.

### CRITICAL

| Condition | Example rule |
|-----------|----------------|
| Club health CRITICAL | Health score &lt; 50 |
| League health CRITICAL | Inactive source on active club; last job FAIL |
| Mirror stale &gt; 96h | `freshness_hours > 96` (active, mirror_live) |
| No success in 7d with failures | `failed_count >= 2` and no `last_success_at` |
| Cron platform FAIL | `loadSyncMonitoring().cron.status === 'FAIL'` |
| Stuck run + failures | `has_running_job` with recent failures |

### WARNING

| Condition | Example rule |
|-----------|----------------|
| Club health WARNING | Score 50–79 |
| Freshness 48–96h | Maps to Health freshness band |
| Success rate 50–80% | `success_rate` in band, min 3 jobs |
| Slow sync | p95 120s–300s or avg 60–120s |
| Single failure in window | `failed_count === 1` |
| Manual import never run | Active manual, no sync |
| Onboarding incomplete on active club | Operational, not outage |

### INFO

| Condition | Example rule |
|-----------|----------------|
| Club HEALTHY with factors | Informational factors only |
| Job running (normal) | `has_running_job` without failure context |
| Onboarding in progress | onboarding club |
| Pilot / test club noise | Filter `pilot-club-test` in evaluator config |

**Dedup rule (v1):** One alert per `(type, clubId, sourceId?)` — highest severity wins.

---

## 6. Operator paths (today + v1)

| Scenario | Today (18.5D) | With alerts v1 |
|----------|---------------|----------------|
| **Sync failure** | Cron card FAIL · Sync History quick “Błędy” · League `recentErrorCount` | Alert CRITICAL → click → History filtered |
| **Unhealthy club** | Club Health table (sort by score) · quick filter “Kluby CRITICAL” | Alert list + click row → club filter |
| **Stale data** | Health factors “Świeżość” · freshness in factors | Alert WARNING/CRITICAL freshness · History by club |
| **Provider issue** | League provider column · filter Provider | Alert grouped by `mirror_live` / `manual_import` |

**Daily operator workflow (recommended):**

1. Open `/platform/monitoring`.
2. Scan **Alerts** strip (CRITICAL count).
3. Click alert → Sync History pre-filtered.
4. Read **Last Error** column; optional future log drawer (out of 18.6A).

---

## 7. Performance impact

| Concern | Assessment |
|---------|------------|
| Extra queries | **0** if alerts computed from existing `HealthMetricsContext` + health rows |
| RPC reuse | **Yes** — `platform_sync_metrics` already once per monitoring load |
| N+1 | **None** — same in-memory maps as Health v2 |
| Dashboard double load | **Already exists** — `computePlatformHealthSummary()` reloads health on dashboard; alerts should share helper, not duplicate logic |
| Monitoring page | +negligible CPU for ~3 clubs × ~15 rules; UI render only |
| Optional +1 query | Latest job per club only if A8/A18 mandatory — prefer infer from RPC + history head (100 rows) client-side |
| Provider-specific alerts | +1 RPC `platform_sync_metrics(NULL, 'mirror_live', 7)` — acceptable optional |

**Risk:** Loading dashboard **and** monitoring in same session runs health twice — pre-existing; fix via shared cache later (not 18.6A scope).

---

## 8. Recommended architecture (18.6B target)

```
loadHealthMetricsContext()     [existing — 1× RPC + 3× Supabase]
        ↓
computeClubHealthRows(ctx)     [existing]
computeLeagueHealthRows(ctx)   [existing]
evaluatePlatformAlerts({       [NEW — pure TS, no DB]
  ctx, clubHealth, leagueHealth, cron?, syncHistoryHead?
})
        ↓
Monitoring Center UI         [NEW — Alerts section]
Platform Dashboard           [optional summary]
```

**Files (future, not now):**

| File | Responsibility |
|------|----------------|
| `src/lib/platform/platform-alerts.ts` | Types, rules, `evaluatePlatformAlerts()` |
| `src/features/platform/components/platform-alerts-panel.tsx` | List UI + drill-down to History |
| Extend `loadPlatformMonitoringBundle` | Attach `alerts: PlatformAlert[]` |

**Explicit non-goals (18.6):** Operations module, `platform_alerts` table, log drawer, retry, new RPC.

---

## 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Alert fatigue (low club count OK) | Low | Severity thresholds; collapse INFO |
| Duplication with Health rows | Medium | Alerts = actionable subset; link don’t repeat all factors |
| No ack → repeated CRITICAL on refresh | Medium | Phase 2 persistence or localStorage mute (hack) |
| `notification_events` misuse | High | Do not reuse for platform ops — wrong schema/RLS |
| Dashboard/monitoring double fetch | Low | Extract shared `loadPlatformHealthBundle()` later |
| pilot-club-test noise | Medium | Exclude in evaluator config |
| Tag vs HEAD drift | Low | Audit based on `6b291b1` / tag `pre-18-6-alerts-foundation` |
| Email without idempotency | High | Defer to phase 4 |

---

## 10. GO / NO-GO

### **GO** — Sprint 18.6B Alerts v1 (computed, Monitoring-first)

**Conditions:**

1. **No new tables/RPC** in first slice.
2. Rules derived from **`platform_sync_metrics` + Health v2** (same window, same thresholds).
3. UI only in **Monitoring Center** (+ optional dashboard counts).
4. Click alert → **existing** Sync History filters (18.5D).
5. Severity model **INFO / WARNING / CRITICAL** as defined above.
6. Defer e-mail, webhook, persistence, Operations module.

### **NO-GO** only if product requires:

- Alert history older than 7d window without archive — needs persistence.
- Operator ack workflow in v1 — needs table.
- Club-facing push notifications for sync — different product (use `notification_events` separately).

---

## 11. Suggested implementation scope (18.6B, reference only)

| Item | Estimate |
|------|----------|
| `platform-alerts.ts` rules + tests | 1d |
| Alerts panel in Monitoring | 1d |
| Dashboard alert count | 0.25d |
| Validation script `validate-186b-alerts.mjs` | 0.25d |

**Total:** ~2–2.5 days after this audit.

---

## 12. References

| Artifact | Path |
|----------|------|
| Metrics RPC | `supabase/migrations/20260704120000_sprint_185a_league_sync_foundation.sql` |
| Health v2 | `src/lib/platform/health.ts` |
| Sync History | `src/lib/platform/sync-history.ts` |
| Monitoring UX | `src/features/platform/components/monitoring-interactive.tsx` |
| Sync History audit | `docs/architecture/sprint-185c-sync-history-v1-audit.md` |
| Platform admin | `docs/ai/10-platform-admin-multi-club.md` |

---

*Audit complete — no implementation authorized in Sprint 18.6A.*
