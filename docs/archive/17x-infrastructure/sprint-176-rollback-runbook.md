# Sprint 17.7 — Rollback Runbook

**Max safe rollback window (PITR):** do **7 dni** wstecz (typowy plan Supabase Pro) — potwierdź w Dashboard przed execution.  
**Practical decision window:** **60 min** od COMMIT patcha (zanim operator zamknie okno bez zachowanego T0 clarity).

---

## Scenario A — Patch fail (before COMMIT)

| | |
|---|---|
| **Detection** | SQL Editor error; `ROLLBACK` implicit; `finance_income` does not exist |
| **Decision** | No rollback needed — prod unchanged |
| **Procedure** | 1. Capture error 2. Fix patch on staging 3. Re-schedule window |
| **Recovery time** | **15–30 min** |

---

## Scenario B — Patch partial / schema mismatch after COMMIT

| | |
|---|---|
| **Detection** | `audit-prod-parity-174.mjs` → `missingTables > 0`; mixed table counts (e.g. 120 not 148) |
| **Decision** | **PITR immediately** — do not run app validation on broken schema |
| **Procedure** | |
| 1 | Stop — disable cron, warn users |
| 2 | Supabase Dashboard → Database → Backups → **Restore to T0** |
| 3 | Wait for restore (project may restart) |
| 4 | Re-run `prod-inventory-snapshot-176.mjs` → confirm 104 tables |
| 5 | Root-cause: split patch per-module or fix SQL |
| **Recovery time** | **1–4 hours** |

---

## Scenario C — Runtime errors (500 on routes)

| | |
|---|---|
| **Detection** | Vercel logs, Supabase API logs, user reports; Sentry if configured |
| **Decision** | Forward-fix if **only new modules** (`/finance`, `/inventory`); PITR if **Piorun core broken** |
| **Procedure (forward-fix)** | |
| 1 | Identify missing RPC vs RLS denial vs app bug |
| 2 | Single-object hotfix SQL (`CREATE OR REPLACE FUNCTION`, `DROP/CREATE POLICY`) |
| 3 | Re-test affected route |
| **Procedure (PITR)** | Same as Scenario B if `/`, `/dashboard`, `/league` broken |
| **Recovery time** | Forward-fix: **30–90 min** · PITR: **1–4 h** |

---

## Scenario D — RLS regression

| | |
|---|---|
| **Detection** | `42501` permission denied for authenticated; owner cannot read own club rows |
| **Decision** | Forward-fix preferred (patch adds ~95 policies — one may conflict) |
| **Procedure** | |
| 1 | SQL: `SELECT * FROM pg_policies WHERE tablename = '<table>'` |
| 2 | Compare with `supabase/prod-parity-patch.sql` expected policy |
| 3 | `DROP POLICY IF EXISTS …; CREATE POLICY …` single fix |
| 4 | If widespread denials across modules → **PITR** |
| **Recovery time** | **30 min – 2 h** (fix) · **1–4 h** (PITR) |

**High-risk tables:** `content_channel_variants`, `match_events`, `player_guardians` (supplement policies in patch).

---

## Scenario E — League sync failure

| | |
|---|---|
| **Detection** | Cron `/api/cron/league-sync` 500; stale fixtures; `league_sync_logs` errors |
| **Decision** | **Not a rollback trigger by default** — league pipeline independent of Finance/Inventory/Integrations tables |
| **Procedure** | |
| 1 | Manual: `npm run sync:league-live` with prod env |
| 2 | Check `league_sources`, `league_player_registry`, RPC `get_public_home_bundle` |
| 3 | If patch broke `league_*` triggers → forward-fix or PITR if data corrupt |
| **Recovery time** | **15–60 min** (sync retry) · PITR only if league schema corrupted |

---

## PITR checklist

### Before patch

- [ ] PITR enabled
- [ ] T0 timestamp recorded (UTC)
- [ ] Operator has org admin on Supabase

### During incident

- [ ] Do not run destructive DROP CASCADE on prod
- [ ] Do not re-apply patch until root cause known

### After PITR restore

- [ ] Verify 104 tables, Piorun club row, 7 auth users
- [ ] Verify `schema_migrations` back to pre-marker state
- [ ] Re-enable Vercel cron only after smoke PASS

---

## Auth & storage after PITR

| Asset | Rollback coverage |
|-------|---------------------|
| **Auth users** | Restored with DB (7 users) |
| **Storage buckets** | Config restored; objects if any restored with DB |
| **Vercel env** | Unchanged (no rollback needed) |
| **External media URLs** | Unaffected (not in patch) |
