# Sprint 17.6 — Production Execution Planning Final Report

**Data:** 2026-06-03  
**Zakres:** plan wykonawczy Production Parity — **read-only**, produkcja nietknięta  
**Następny sprint:** 17.7 Production Parity Execution (apply)

---

## Executive Summary

| Element | Status |
|---------|--------|
| Pre-patch inventory | ✅ Snapshot live (2026-06-03) |
| Execution runbook | ✅ [`sprint-176-execution-runbook.md`](./sprint-176-execution-runbook.md) |
| Rollback runbook | ✅ [`sprint-176-rollback-runbook.md`](./sprint-176-rollback-runbook.md) |
| Validation checklist | ✅ [`sprint-176-validation-checklist.md`](./sprint-176-validation-checklist.md) |
| Patch tested (embedded PG) | ✅ Sprint 17.5b GO |
| Supabase cloud staging | ⚠️ Nie wykonane (17.5 NO-GO — brak tokena) |
| **GO for Sprint 17.7** | **GO** (z warunkami wstępnymi) |

---

## 1. Production Inventory Report (FAZA 1)

**Snapshot:** [`sprint-176-production-inventory.json`](./sprint-176-production-inventory.json)  
**Refresh:** `node scripts/prod-inventory-snapshot-176.mjs`  
**Gap analysis:** `node scripts/audit-prod-parity-174.mjs`

### Supabase Production (`pwkqnwqvrdiaycveacxa`)

| Metryka | Wartość (T0) | Docelowo po patch |
|---------|--------------|-------------------|
| **Tabele** | **104** | **148** |
| **Funkcje** | **158** | **~249** |
| **RPC** | **16** | **19** |
| **Enumy** | **93** | **129** |
| **Polityki RLS** | **244** | **~340** |
| **Triggery** | **156** | **~220** |
| **Storage buckets** | **2** | **2** |
| Auth users | 7 | 7 (unchanged) |
| Clubs | 1 (`piorun-wawrzenczyce`) | 1 |
| `schema_migrations` | **2** | **5+** (po markerach) |

**Tracked migrations (prod dziś):**

| Version | Note |
|---------|------|
| `20260703120000` | league_player_matching (partial tracking) |
| `20260703140000` | follow-up league migration |

**Brakujące vs baseline (44 tabele):** Finance (9), Inventory (13), Academy (12), Integrations (10).

**Storage buckets:**

| ID | Public | Limit |
|----|--------|-------|
| `club-assets` | false | 10 MB |
| `club-videos` | false | 500 MB |

**Extensions:** `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `plpgsql`

### Vercel Production

| Element | Wartość |
|---------|---------|
| URL | https://pilka-mu.vercel.app |
| Region | `fra1` (Frankfurt) |
| Framework | Next.js |
| Build | `npm run build` |

### ENV (production — verify in Vercel Dashboard)

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin |
| `NEXT_PUBLIC_SITE_URL` | Canonical site |
| `CRON_SECRET` / `LEAGUE_SYNC_CRON_SECRET` | Cron auth |
| `OPENAI_API_KEY` | AI module (optional) |
| `LNP_*` | League live sync tokens (operator-local, rotacyjne) |

**Not on Vercel:** `SUPABASE_DB_PASSWORD` — tylko u operatora do psql/SQL Editor.

### Cron

| Path | Schedule | Max duration |
|------|----------|--------------|
| `/api/cron/league-sync` | `0 6 * * *` UTC | 300s |

**Manual equivalent:** `npm run sync:league-live`

---

## 2. Production Execution Plan (FAZA 2)

Szczegóły krok po kroku: [`sprint-176-execution-runbook.md`](./sprint-176-execution-runbook.md)

| Step | Akcja | Czas | Ryzyko | Expected outcome | Rollback point |
|------|-------|------|--------|------------------|----------------|
| **0** | PITR verify + T0 + auth/storage note | 15–20 min | Niskie | T0 zapisany, PITR ON | Anuluj okno |
| **1** | Maintenance (cron off, komunikacja) | 5–10 min | Niskie | Brak równoległego sync | Włącz cron |
| **2** | `prod-parity-patch.sql` w SQL Editor | 3–8 min | Średnie | 148 tabel, COMMIT OK | Auto-rollback pre-COMMIT; PITR post-COMMIT |
| **3** | Schema validation (`audit-prod-parity-174.mjs`) | 10–15 min | Niskie | `missingTables = 0` | PITR if fail |
| **4** | Application validation (checklist 14+7) | 15–25 min | Średnie | Piorun core PASS | Forward-fix or PITR |
| **5** | Migration tracking markers | 2 min | Niskie | 3 markery w `schema_migrations` | DELETE markers only |
| **6** | Re-enable traffic + cron | 5 min | Niskie | Prod live, monitoring | — |

**Patch file:** `supabase/prod-parity-patch.sql` (~155 KB, `BEGIN…COMMIT`, idempotent, zero INSERT/UPDATE danych klubowych).

---

## 3. Backup & PITR Report (FAZA 3)

### Weryfikacja (operator — przed STEP 0)

| Item | Action | Status |
|------|--------|--------|
| **PITR** | Supabase Dashboard → Database → Backups → Enabled | ☐ Verify |
| **Retention** | Record days (typ. 7 on Pro) | ☐ Verify |
| **Daily backup** | Automatic snapshots | ☐ Verify |
| **Storage** | Buckets config in DB; export not required if objects empty | ☐ Verify |
| **Auth** | 7 users — optional CSV export | ☐ Optional |

### Checklist

**Przed patch:**

- [ ] PITR enabled + retention confirmed
- [ ] T0 timestamp (UTC) written
- [ ] Pre-patch inventory JSON saved
- [ ] Cron disabled in Vercel
- [ ] Operator has Supabase org admin

**W trakcie:**

- [ ] Single SQL session — one apply
- [ ] No parallel schema changes
- [ ] Error log captured

**Po patch:**

- [ ] Post-patch inventory JSON saved
- [ ] T0 retained for rollback window
- [ ] Markers inserted only after PASS

### Maksymalny bezpieczny czas rollback

| Method | Window | Time to execute |
|--------|--------|-----------------|
| **Pre-COMMIT failure** | Unlimited | Immediate (auto rollback) |
| **PITR restore** | **Do 7 dni** (confirm plan) | **1–4 hours** |
| **Forward-fix SQL** | Best within **60 min** of COMMIT | 30–90 min |

**Rekomendacja:** Traktuj **60 min** po COMMIT jako okno decyzyjne na PITR vs forward-fix.

---

## 4. Maintenance Window Report (FAZA 4)

### Szacunki czasu

| Faza | Min | Max |
|------|-----|-----|
| PITR + prep | 15 | 20 |
| Maintenance setup | 5 | 10 |
| Patch apply | 3 | 8 |
| Schema validation | 10 | 15 |
| App validation | 15 | 25 |
| Markers + re-enable | 7 | 10 |
| **Total execution** | **55 min** | **88 min** |
| PITR rollback (reserve) | 60 | 240 |

### Rekomendacja okna

| Option | Duration | Verdict |
|--------|----------|---------|
| 15 min | Za krótkie | ❌ Nie wystarczy na walidację 14 modułów |
| **30 min** | Minimalne | ⚠️ Tylko patch + schema audit — **bez pełnej app validation** |
| **60 min** | **Rekomendowane** | ✅ Patch + schema + app smoke + bufor decyzyjny |
| 60+ min | Bezpieczne | ✅ Jeśli pierwszy raz na prod lub brak cloud staging |

**Uzasadnienie 60 min:**

1. Patch SQL ~155 KB — na Supabase typowo **< 5 min**, ale SQL Editor może timeoutować przy błędzie diagnostyki.
2. Walidacja **14 modułów dashboard + 7 stron public** wymaga **≥ 20 min** przy manualnym smoke.
3. **30 min bufor** na forward-fix lub start PITR bez presji.
4. Unikaj **05:30–06:30 UTC** (cron league sync).

**Proponowane okno:** **22:00–23:00 CET** (pon–czw), cron wyłączony.

---

## 5. Validation Checklist (FAZA 5)

Pełna lista: [`sprint-176-validation-checklist.md`](./sprint-176-validation-checklist.md)

### Database targets (post-patch)

| Check | Target |
|-------|--------|
| Table count | 148 |
| Function count | ~249 |
| RPC count | 19 |
| Policy count | ~340 |
| Trigger count | ~220 |
| `missingTables` | 0 |

### Application (14 modules)

Auth, Website, Teams, Players, League, CRM, Attendance, Communication, Equipment, Injuries, Finance, Inventory, Academy, Integrations — **PASS required on 1–10**; 11–14 may be empty state PASS.

### Website

Homepage, news, gallery, sponsors, team, table, matches — **PASS required**.

---

## 6. Rollback Runbook (FAZA 6)

Pełna procedura: [`sprint-176-rollback-runbook.md`](./sprint-176-rollback-runbook.md)

| Scenario | Detection | Decision | Recovery |
|----------|-----------|----------|----------|
| **A** Patch fail | SQL error pre-COMMIT | Retry after fix | 15–30 min |
| **B** Partial schema | `missingTables > 0` | PITR to T0 | 1–4 h |
| **C** Runtime 500 | Logs, user reports | Forward-fix or PITR | 30 min – 4 h |
| **D** RLS regression | 42501 widespread | Policy hotfix or PITR | 30 min – 4 h |
| **E** League sync fail | Cron 500 | Retry sync — **not auto-rollback** | 15–60 min |

---

## 7. Migration Tracking Strategy (FAZA 7)

### Decyzja: **B — Baseline marker + nowe migracje**

**NIE** backfill 103 wpisów historycznych.

| | Opcja A (backfill 103) | Opcja B (markery) ✅ |
|---|------------------------|----------------------|
| Audyt | Fałszywa pełna historia | Uczciwy cutover |
| CLI Supabase | Mylące | Jasna reguła od `20260705*` |
| Hotfixy untracked | Ukryte | Documented legacy tag |
| Ryzyko | Wysokie | Niskie |

### SQL po successful parity (STEP 5)

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260704000000', 'fc_os_baseline_173'),
  ('20260704100000', 'fc_os_prod_parity_patch_174'),
  ('20260531120000', 'legacy_applied_manual_pre_baseline')
ON CONFLICT (version) DO NOTHING;
```

### Docelowy stan repo (post-17.7)

```
supabase/
  baseline.sql                    # new projects
  prod-parity-patch.sql           # prod one-shot (archived after apply)
  migrations/                     # forward-only from 20260705*
  migrations-archive/             # 105 historical (read-only reference)
```

**Reguła:** każda nowa migracja kończy się INSERT do `schema_migrations`.

Szczegóły: [`sprint-174-migration-tracking.md`](./sprint-174-migration-tracking.md)

---

## 8. Club #2 Readiness Report (FAZA 8)

### Po parity na **istniejącej produkcji** (multi-tenant SaaS)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy wystarczy `baseline + bootstrap-club`? | **NIE** — baseline **nie** stosujemy na prod z danymi |
| Czy wystarczy `bootstrap-club`? | **TAK** (schema już kompletna) |

```bash
node scripts/bootstrap-club.mjs \
  --slug new-club \
  --name "New FC" \
  --short-name NFC \
  --colors "#1e3a5f,#f5c518,#ffffff" \
  --owner-email owner@newclub.pl
```

### Po parity — ręczne kroki dla Klubu #2

| # | Step | Required |
|---|------|----------|
| 1 | `bootstrap-club.mjs` | ✅ |
| 2 | Owner accept invite / Supabase Auth | ✅ |
| 3 | `website_settings` content (hero, logo upload) | ✅ |
| 4 | League sources config (`league_sources`, LNP tokens) | ✅ if live sync |
| 5 | Media upload (`club-assets` bucket) | Optional |
| 6 | Custom domain / DNS | Optional |
| 7 | Facebook/social integrations | Optional |

### Nowy projekt Supabase (greenfield)

| Path | Steps |
|------|-------|
| Fresh project | `baseline.sql` → `bootstrap-club.mjs` |

**Verdict:** Klub #2 na prod po parity = **TAK** via bootstrap only (bez baseline).

---

## 9. Final GO/NO-GO (FAZA 9)

### Czy FC OS jest gotowy do Sprint 17.7 Production Parity Execution?

## **GO**

### Warunki wstępne (must complete before apply)

- [ ] PITR verified ON (Dashboard screenshot in ticket)
- [ ] Maintenance window scheduled (60 min, cron disabled)
- [ ] Operator read [`sprint-176-execution-runbook.md`](./sprint-176-execution-runbook.md)
- [ ] Patch file hash matches release tag / commit
- [ ] **Recommended:** Supabase cloud staging replay (17.5 gap — mitigated by 17.5b embedded PASS)
- [ ] Post-patch validation checklist printed/ready
- [ ] Rollback owner identified (who can trigger PITR)

### Executive checklist (17.7 day-of)

```
□ T0 recorded
□ Cron disabled
□ Pre-patch inventory saved (104 tables)
□ prod-parity-patch.sql applied — 0 errors
□ Post-patch audit — missingTables = 0
□ Piorun / dashboard PASS
□ Piorun public / PASS
□ Migration markers inserted
□ Cron re-enabled
□ Post-patch inventory saved (148 tables)
□ Sign-off
```

---

## 10. Production Readiness — TOP 10 Operational Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Patch fail mid-transaction** | Zero change if pre-COMMIT | Single BEGIN/COMMIT; capture error; retry on staging |
| 2 | **No cloud Supabase staging** | Unknown prod-specific edge | 17.5b embedded PASS; recommend cloud clone before 17.7 if token available |
| 3 | **PITR not enabled / expired plan** | No fast rollback | Verify Dashboard STEP 0; abort if OFF |
| 4 | **League cron during window** | Concurrent writes during patch | Disable cron STEP 1; avoid 06:00 UTC |
| 5 | **RLS policy conflict on supplements** | Owner denied access | Validate dashboard first; policy hotfix runbook Scenario D |
| 6 | **`get_public_home_bundle` regression** | Public homepage 500 | Priority smoke `/`; academy_groups now exists post-patch |
| 7 | **SQL Editor timeout** | Partial apply perception | Use psql `-v ON_ERROR_STOP=1`; verify counts after |
| 8 | **False confidence from empty new modules** | Finance/Inventory untested with data | Accept empty PASS; document UAT post-launch |
| 9 | **Migration tracking drift** | Future CLI confusion | Insert 3 markers STEP 5; document cutover |
| 10 | **Operator applies baseline on prod** | Catastrophic duplicate schema | Runbook explicitly: **patch only**, never baseline on prod |

---

## Artefakty Sprint 17.6

| Plik | Rola |
|------|------|
| [`sprint-176-final-report.md`](./sprint-176-final-report.md) | Ten raport |
| [`sprint-176-execution-runbook.md`](./sprint-176-execution-runbook.md) | Operator step-by-step |
| [`sprint-176-rollback-runbook.md`](./sprint-176-rollback-runbook.md) | Scenariusze A–E |
| [`sprint-176-validation-checklist.md`](./sprint-176-validation-checklist.md) | PASS/FAIL checklist |
| [`sprint-176-production-inventory.json`](./sprint-176-production-inventory.json) | T0 snapshot |
| [`sprint-174-parity-inventory.json`](./sprint-174-parity-inventory.json) | Gap analysis |
| [`supabase/prod-parity-patch.sql`](../../supabase/prod-parity-patch.sql) | Patch (do not apply in 17.6) |
| [`scripts/prod-inventory-snapshot-176.mjs`](../../scripts/prod-inventory-snapshot-176.mjs) | Inventory refresh |
| [`scripts/audit-prod-parity-174.mjs`](../../scripts/audit-prod-parity-174.mjs) | Parity audit |

---

**Sprint 17.6 status: COMPLETE**  
**Produkcja: UNTOUCHED**  
**Next: Sprint 17.7 — authorized execution only**
