# Sprint 17.4 — Production Parity Final Report

**Data:** 2026-06-03  
**Zakres:** inventory, patch design, runtime audit, rollback, staging plan  
**Produkcja:** nietknięta · patch nie wykonany

---

## Executive Summary

| Źródło | Tabele | Zgodność z baseline |
|--------|--------|---------------------|
| **baseline.sql** | 148 | — |
| **repo (105 migracji)** | 148 | ✅ PASS (identyczne z baseline) |
| **produkcja (live)** | 104 | ❌ FAIL (−44 tabele) |

**Główna luka:** 4 moduły nigdy zmigrowane na prod — Finance, Inventory, Academy, Integrations.

**Deliverable:** [`supabase/prod-parity-patch.sql`](../../supabase/prod-parity-patch.sql) (~141 KB, idempotentny, bez danych).

---

## 1. Production Parity Inventory

Pełne dane: [`sprint-174-parity-inventory.json`](./sprint-174-parity-inventory.json)

### Werdykty

| Obiekt | Baseline | Prod | Brakuje | Werdykt |
|--------|----------|------|---------|---------|
| Tabele | 148 | 104 | **44** | **FAIL** |
| Enumy | 129+25 alter | 93 | **36** | **WARNING** |
| Funkcje | 213* | 158 | **55** | **FAIL** |
| RPC | 19 | 16 | **3** | **WARNING** |
| Polityki RLS | ~352 statements | 244 | **95** | **WARNING** |
| Triggery | ~221 | ~156 | **65** | **WARNING** |
| Storage buckets | 2 | 2 | **0** | **PASS** |
| Repo vs baseline | 148 | — | 0 | **PASS** |

\*Liczba funkcji w baseline parse zawiera funkcje później usunięte (np. `user_has_club_permission` — DROP w security_hardening). **Efektywny gap modułowy: ~54 funkcje**, nie 55.

### 44 brakujące tabele (prod)

| Moduł | Tabele | Count |
|-------|--------|-------|
| **Finance** | finance_budgets, finance_documents, finance_expenses, finance_fee_plans, finance_grants, finance_income, finance_player_fee_payments, finance_player_fees, finance_reports | 9 |
| **Inventory** | inventory_categories, inventory_damages, inventory_items, inventory_kit_assignments, inventory_player_kits, inventory_purchase_order_lines, inventory_purchase_orders, inventory_reports, inventory_returns, inventory_stocktake_lines, inventory_stocktakes, inventory_suppliers, inventory_transactions | 13 |
| **Academy** | academy_groups, academy_group_staff, player_assessments, player_development, player_development_history, player_goals, player_team_transitions, fitness_tests, opponent_analysis, scouting_clubs, scouting_players, scouting_reports | 12 |
| **Integrations** | integrations, integration_sources, integration_imports, integration_club_mappings, external_leagues, external_teams, external_matches, sync_jobs, sync_logs, sync_conflicts | 10 |

### 3 brakujące RPC

| RPC | Moduł |
|-----|-------|
| `get_finance_dashboard_totals` | Finance |
| `get_inventory_dashboard_stats` | Inventory |
| `get_inventory_report_summary` | Inventory |

### 36 brakujących enumów

Wszystkie należą do modułów Finance (8), Inventory (10), Academy (6), Integrations (8), plus `player_goal_status`, `team_transition_type`, `fitness_test_type`.

### Storage buckets

**PASS** — `club-assets`, `club-videos` obecne na prod.

---

## 2. Missing Objects Classification

| Moduł | Obiekty | Klasa | Runtime | Uzasadnienie |
|-------|---------|-------|---------|--------------|
| Finance | 9 tabele + 8 enum + ~15 fn + 1 RPC | **A REQUIRED** | ACTIVE | `/finance/*` — 10+ routes, `features/finance/actions.ts` |
| Inventory | 13 tabele + 10 enum + ~20 fn + 2 RPC | **A REQUIRED** | ACTIVE | `/inventory/*` — 12 routes |
| Academy | 12 tabel + 6 enum + ~12 fn | **A REQUIRED** | ACTIVE | `/academy/*` — 8 routes; `get_public_home_bundle` references academy |
| Integrations | 10 tabel + 8 enum + ~10 fn | **A REQUIRED** | ACTIVE | `/integrations/*` — 8 routes, sync-engine |
| academy_group_staff | 1 tabela | **B OPTIONAL** | INACTIVE | Tylko `types/database.ts` — brak `.from()` queries |
| user_has_club_permission | funkcja | **C DEAD** | N/A | Intencjonalnie DROP w security_hardening — nie gap |

**DEAD:** brak martwych tabel — wszystkie 44 należą do aktywnych modułów produktu.

---

## 3. Runtime Impact Report

Pełne dane: [`sprint-174-runtime-impact.json`](./sprint-174-runtime-impact.json)

| Status | Tabele | Opis |
|--------|--------|------|
| **ACTIVE** | **43** | `.from()` / `.insert()` / `.update()` w kodzie |
| **INACTIVE** | **1** | academy_group_staff (tylko typy TS) |
| **UNKNOWN** | **0** | — |

### Potencjalne runtime errors na prod (43)

Każda ACTIVE tabela → **`relation "X" does not exist`** gdy użytkownik wejdzie w odpowiedni moduł dashboard.

**Najwyższe ryzyko UX:**

| Route | Tabele | Wpływ na Piorun dziś |
|-------|--------|----------------------|
| `/finance/*` | finance_* | Moduł niedostępny — **404/500** |
| `/inventory/*` | inventory_* | Moduł niedostępny |
| `/academy/*` | academy_*, player_development | Moduł niedostępny |
| `/integrations/*` | integrations, sync_* | Moduł niedostępny |
| `/` (public) | academy_groups (via RPC) | **Częściowo mitigated** — hotfix 410 bez tabeli |

**Moduły działające na prod (bez regresji po patchu):** League, Website, Players, CRM, Attendance, Communication, Equipment, Injuries, Sponsors, AI, Video, Content, PWA.

---

## 4. Production Patch Design

Plik: [`supabase/prod-parity-patch.sql`](../../supabase/prod-parity-patch.sql)

### Statystyki patcha

| Metryka | Wartość |
|---------|---------|
| Rozmiar | ~141 KB |
| CREATE TABLE IF NOT EXISTS | 45 |
| Enumy (DO blocks) | 36 |
| Funkcje | 65 |
| Polityki RLS | 112 |
| Stripped data blocks | 14 |
| Piorun UUID refs | **0** |
| INSERT/UPDATE/DELETE | **0** |

### Źródła (12 plików)

**Moduły:**
- `finance_module` + `finance_audit_hardening`
- `inventory_module` + `inventory_audit_hardening` ×2
- `integrations_module` + `integrations_audit_hardening`
- `academy_module` + `academy_audit_hardening` + `academy_audit_fixes`

**Suplementy (audit na prod bez pełnego hardening):**
- `matches_audit_hardening` (830) — `enforce_match_event_players_team`
- `stage15a_audit_hardening` — content enforce functions

### Idempotentność

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- Enumy: `DO $$ … EXCEPTION WHEN duplicate_object`
- `ALTER TYPE ADD VALUE IF NOT EXISTS`
- `CREATE OR REPLACE FUNCTION`
- `DROP POLICY IF EXISTS` + `CREATE POLICY`

**Nie uruchamiać na prod bez staging validation.**

---

## 5. Rollback Strategy

Szczegóły: [`sprint-174-rollback-strategy.md`](./sprint-174-rollback-strategy.md)

| Scenariusz | Strategia | Czas |
|------------|-----------|------|
| A — patch fail | Auto ROLLBACK transakcji | 15–30 min |
| B — partial apply | PITR restore | 2–6 h |
| C — app errors | Forward-fix / PITR | 30 min – 4 h |

**Ryzyko dla Piorun:** Niskie — moduły patcha nie mają danych na prod; istniejące moduły (liga, website) nie są modyfikowane strukturalnie poza audit supplements.

---

## 6. Staging Validation Plan

Szczegóły: [`sprint-174-staging-plan.md`](./sprint-174-staging-plan.md)

```
Nowy Supabase → baseline.sql → prod-parity-patch.sql → bootstrap-club → smoke tests
```

Checklist: 14 modułów (auth, website, teams, players, league, crm, attendance, communication, equipment, injuries, finance, inventory, academy, integrations).

**Czas:** 4–5 h · **Pass criteria:** `missingTables === 0`

---

## 7. Migration Tracking Recommendation

Szczegóły: [`sprint-174-migration-tracking.md`](./sprint-174-migration-tracking.md)

| Pytanie | Odpowiedź |
|---------|-----------|
| Backfill 103 wpisów? | **NIE** |
| Reset od baseline? | **TAK** |

Markery po parity:
- `20260704000000` — `fc_os_baseline_173`
- `20260704100000` — `fc_os_prod_parity_patch_174`

---

## Podsumowanie liczb (dokładne, live prod query 2026-06-03)

| Metryka | Liczba |
|---------|--------|
| Brakujące tabele | **44** |
| Brakujące enumy | **36** |
| Brakujące funkcje (audit) | **55** (54 efektywne po odjęciu DEAD) |
| Brakujące RPC | **3** |
| Brakujące polityki RLS | **95** |
| Brakujące triggery | **65** |
| Brakujące storage buckets | **0** |

---

## Czy FC OS jest gotowy do Sprintu 17.5 (Migration Tracking Recovery)?

### **TAK**

**Uzasadnienie:**

1. ✅ Pełna inventory baseline ↔ repo ↔ prod (44 tabele zidentyfikowane)
2. ✅ `prod-parity-patch.sql` zaprojektowany, idempotentny, bez danych klubowych
3. ✅ Runtime impact znany — 43 ACTIVE tables, 43 potencjalne errors zmapowane
4. ✅ Rollback strategy per moduł (A/B/C)
5. ✅ Staging validation plan z checklistą 14 modułów
6. ✅ Rekomendacja tracking: reset od baseline (nie backfill 103)
7. ✅ Repo = baseline (148 tabel) — spójność kod ↔ docelovy schemat

**Warunki przed prod apply (Sprint 17.5+):**

- [ ] Staging apply patch → PASS
- [ ] PITR backup verified
- [ ] Smoke test Piorun routes (liga, website, dashboard)
- [ ] Maintenance window approved

Sprint 17.5 może rozpocząć **migration tracking recovery** i **staging execution** — prod apply pozostaje osobną decyzją operacyjną.

---

## Artefakty

| Plik | Rola |
|------|------|
| `supabase/prod-parity-patch.sql` | Forward patch (design) |
| `scripts/audit-prod-parity-174.mjs` | Inventory generator |
| `scripts/generate-prod-parity-patch-174.mjs` | Patch generator |
| `scripts/audit-runtime-impact-174.mjs` | Code scan |
| `docs/architecture/sprint-174-*.json/md` | Raporty |
