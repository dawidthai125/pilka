# Sprint 17.7 — Production Parity Execution Runbook

**Audience:** Operator bez kontekstu historycznego FC OS  
**Prerequisites:** Sprint 17.6 planning complete · approval signed · PITR verified  
**Production:** https://pilka-mu.vercel.app · Supabase `pwkqnwqvrdiaycveacxa`  
**Patch file:** `supabase/prod-parity-patch.sql` (~155 KB, idempotent, **schema only**)

> ⚠️ Ten dokument opisuje **plan wykonania**. Nie uruchamiaj kroków bez osobnej autoryzacji operacyjnej.

---

## Quick reference

| Artifact | Path |
|----------|------|
| Pre-patch inventory | `docs/architecture/sprint-176-production-inventory.json` |
| Parity gap analysis | `docs/architecture/sprint-174-parity-inventory.json` |
| Patch SQL | `supabase/prod-parity-patch.sql` |
| Post-patch audit | `node scripts/audit-prod-parity-174.mjs` |
| Inventory snapshot | `node scripts/prod-inventory-snapshot-176.mjs` |

---

## STEP 0 — PITR backup & freeze point

**Czas:** 15–20 min · **Ryzyko:** Niskie · **Rollback point:** T0 (timestamp przed patchem)

### 0.1 Supabase Dashboard

1. Zaloguj się: [Supabase Dashboard](https://supabase.com/dashboard/project/pwkqnwqvrdiaycveacxa)
2. **Settings → Database → Backups**
   - [ ] PITR **Enabled**
   - [ ] Retention ≥ 7 dni (plan Pro)
   - [ ] Zapisz retention end date: _______________
3. **Settings → Database → Connection string** — przygotuj psql / SQL Editor
4. Zapisz **T0** = `2026-__-__ __:__:__ UTC` (moment przed STEP 2)

### 0.2 Auth snapshot (7 users)

1. **Authentication → Users** → Export CSV (opcjonalnie)
2. Lub zapisz count: oczekiwane **7** users (inventory 2026-06-03)

### 0.3 Storage snapshot

| Bucket | Public | Limit |
|--------|--------|-------|
| `club-assets` | false | 10 MB |
| `club-videos` | false | 500 MB |

- [ ] Buckets istnieją (PASS w inventory)
- [ ] Brak potrzeby backup plików jeśli `storage.objects` puste — media Piorun głównie URL w `website_media`

### 0.4 Vercel

1. [Vercel Dashboard](https://vercel.com) → projekt `pilka-mu`
2. Zapisz aktualny deployment ID: _______________
3. **Settings → Cron Jobs** — zanotuj `/api/cron/league-sync` @ **06:00 UTC**
4. **Settings → Environment Variables** — potwierdź obecność (bez kopiowania wartości do logów):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` lub `LEAGUE_SYNC_CRON_SECRET`
   - `SUPABASE_DB_PASSWORD` (lokalnie operatora, nie na Vercel)

### Expected outcome

- T0 zapisany
- PITR potwierdzone ON
- Operator ma dostęp SQL Editor + psql

### Rollback

Anuluj okno — brak zmian.

---

## STEP 1 — Maintenance mode

**Czas:** 5–10 min · **Ryzyko:** Niskie · **Rollback point:** T1

> FC OS **nie ma** wbudowanego flagi maintenance w kodzie (Sprint 17.6). Użyj procedury operacyjnej:

### 1.1 Wyłącz cron (zalecane)

1. Vercel → Cron Jobs → **Disable** `/api/cron/league-sync` na czas okna
2. Alternatywa: usuń wpis z `vercel.json` + redeploy (**wymaga deploy — poza minimalnym oknem**)

### 1.2 Komunikacja

- [ ] Powiadom właściciela klubu (Piorun) o oknie 30–60 min
- [ ] Unikaj **06:00 UTC** (cron league sync)

### 1.3 Soft maintenance (minimalny footprint)

- Okno: **22:00–23:30 CET** w dzień roboczy (niski ruch)
- Operator monitoruje `/` i `/dashboard` — przy błędach → rollback

### 1.4 Hard maintenance (opcjonalne, wymaga deploy)

Deploy branch z middleware `503` — **poza scope minimalnego patcha**; rezerwuj na awarie.

### Expected outcome

- Cron wyłączony
- Brak równoległych synców ligowych podczas patcha

### Rollback

Włącz cron z powrotem.

---

## STEP 2 — Apply `prod-parity-patch.sql`

**Czas:** 3–8 min · **Ryzyko:** Średnie · **Rollback point:** T2 (przed COMMIT) / T0 (po COMMIT)

### 2.1 Pre-flight SQL (SQL Editor)

```sql
-- Baseline inventory (oczekiwane PRZED patchem)
SELECT count(*) AS tables FROM pg_tables WHERE schemaname = 'public';
-- EXPECT: 104

SELECT count(*) AS finance_tables FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'finance_%';
-- EXPECT: 0

SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
-- EXPECT: 2 rows (20260703120000, 20260703140000)
```

### 2.2 Apply patch

**Metoda A — Supabase SQL Editor (zalecana):**

1. Otwórz `supabase/prod-parity-patch.sql` z repozytorium (commit zatwierdzony na tagu release)
2. Wklej **cały plik** (zawiera `BEGIN;` … `COMMIT;`)
3. Run once
4. Przechwyć output — **0 errors**

**Metoda B — psql:**

```bash
psql "postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -v ON_ERROR_STOP=1 \
  -f supabase/prod-parity-patch.sql
```

### 2.3 Failure before COMMIT

- Transakcja auto-ROLLBACK
- Prod **unchanged** (104 tabele)
- Diagnoza błędu → fix patch → walidacja na staging → retry

### 2.4 Success after COMMIT

```sql
SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
-- EXPECT: 148

SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'finance_%';
-- EXPECT: 9 tables
```

### Expected outcome

- 44 nowe tabele (Finance, Inventory, Academy, Integrations)
- 3 nowe RPC dostępne
- Istniejące dane Piorun nietknięte

---

## STEP 3 — Schema validation

**Czas:** 10–15 min · **Ryzyko:** Niskie

### 3.1 Automated (operator laptop)

```bash
node scripts/audit-prod-parity-174.mjs
node scripts/prod-inventory-snapshot-176.mjs
```

### 3.2 Pass criteria

| Metric | Pre-patch | Post-patch target |
|--------|-----------|-------------------|
| Tables | 104 | **148** |
| Enums | 93 | **129** |
| Functions | 158 | **~249** |
| RPC | 16 | **19** |
| Policies | 244 | **~340** |
| Triggers | 156 | **~220** |
| Buckets | 2 | **2** |
| `missingTables` (audit) | 44 | **0** |

### 3.3 Manual spot checks

```sql
-- New RPC
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname IN (
  'get_finance_dashboard_totals',
  'get_inventory_dashboard_stats',
  'get_inventory_report_summary'
);

-- Piorun club intact
SELECT slug, public_name FROM public.clubs WHERE slug = 'piorun-wawrzenczyce';

-- League registry (must still exist)
SELECT count(*) FROM public.league_player_registry;
```

### Rollback trigger

`missingTables > 0` po COMMIT → przejdź do **Rollback Scenario B** (PITR).

---

## STEP 4 — Application validation

**Czas:** 15–25 min · **Ryzyko:** Średnie

Pełna checklista: [`sprint-176-validation-checklist.md`](./sprint-176-validation-checklist.md)

### Priorytet walidacji (Piorun)

1. **Istniejące moduły FIRST** (regresja):
   - Login → `/dashboard`
   - Public: `/`, `/druzyna`, `/tabela`, `/mecze`
   - League hub, players, CRM, attendance
2. **Nowe moduły SECOND** (wcześniej broken — oczekiwane poprawne puste stany):
   - `/finance`, `/inventory`, `/academy`, `/integrations`

### Rollback trigger

- Public homepage 500 **lub** dashboard global 500 dla owner → Scenario C/D
- Liga nie ładuje meczów → Scenario E

---

## STEP 5 — Migration tracking markers

**Czas:** 2 min · **Ryzyko:** Niskie · **Wykonaj PO walidacji PASS**

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260704000000', 'fc_os_baseline_173'),
  ('20260704100000', 'fc_os_prod_parity_patch_174'),
  ('20260531120000', 'legacy_applied_manual_pre_baseline')
ON CONFLICT (version) DO NOTHING;

SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
-- EXPECT: ≥ 5 rows (2 legacy + 2 league + 3 markers)
```

**Nie backfilluj 103 migracji** — patrz [`sprint-174-migration-tracking.md`](./sprint-174-migration-tracking.md).

---

## STEP 6 — Re-enable traffic

**Czas:** 5 min

1. [ ] Włącz cron league-sync w Vercel
2. [ ] Smoke test public `/` (hard refresh)
3. [ ] Powiadom klub — okno zamknięte
4. [ ] Zapisz post-patch inventory JSON w ticketu operacyjnym
5. [ ] Monitor Supabase logs 30 min

---

## STEP 7 — Post-execution sign-off

| Check | PASS / FAIL |
|-------|-------------|
| Schema audit `missingTables = 0` | |
| Piorun public site | |
| Piorun dashboard | |
| Cron re-enabled | |
| Tracking markers inserted | |
| T0 retained for 7 days | |

**Operator signature:** _______________ **Date:** _______________

---

## Emergency contacts & links

| Resource | URL |
|----------|-----|
| Supabase project | https://supabase.com/dashboard/project/pwkqnwqvrdiaycveacxa |
| Vercel production | https://pilka-mu.vercel.app |
| Rollback detail | [`sprint-176-rollback-runbook.md`](./sprint-176-rollback-runbook.md) |
| PITR restore | Supabase Dashboard → Database → Backups → Restore |
