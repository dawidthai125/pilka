# Sprint 17.5 — Staging Validation Final Report

**Data:** 2026-06-03  
**Produkcja:** nietknięta  
**Supabase cloud staging:** **NIE utworzony**

---

## Executive Summary

| Faza | Wynik | Uwagi |
|------|-------|-------|
| 1 — Staging env | **FAIL** | Brak `SUPABASE_ACCESS_TOKEN` |
| 2 — Baseline apply | **FAIL** | Monolit + kolejność migracji |
| 3 — Parity patch | **FAIL** | Syntax error (partial state) |
| 4 — Bootstrap club | **SKIP** | Brak działającego staging |
| 5 — Schema validation | **FAIL** | 88 brakujących tabel (partial) |
| 6 — Smoke tests | **FAIL** | 12/14 modułów |
| 7 — Migration safety | **PASS** | Test migration tracked |
| 8 — Prod readiness 17.6 | **NIE** | 4 blokery |

### **GO / NO-GO Sprint 17.6: NO-GO**

---

## FAZA 1 — Staging Environment

### Cel: `FCOS-STAGING-173` (Supabase cloud)

| Pole | Wartość |
|------|---------|
| Project ID | **N/A** — projekt nie utworzony |
| Region | planowany: `eu-west-1` |
| PostgreSQL | planowany: 15.x (Supabase managed) |

**Przyczyna:** `.env.local` nie zawiera `SUPABASE_ACCESS_TOKEN` (wymagany do Management API / `supabase projects create`).

**Co zrobiono zamiast tego:** walidacja częściowa na **embedded PostgreSQL 18.3** (lokalnie, port 55433) ze stubami `auth.*`, ról `authenticated`/`anon`/`service_role`.

**Aby dokończyć FAZĘ 1:**

```bash
# 1. Dodaj do .env.local:
#    SUPABASE_ACCESS_TOKEN=<personal access token z supabase.com/dashboard/account/tokens>

# 2. Utwórz projekt:
node scripts/staging-create-project-175.mjs

# 3. Powstanie .env.staging.local z credentials
```

---

## FAZA 2 — Baseline Apply

### Monolit `baseline.sql`

| Metryka | Wynik |
|---------|-------|
| Werdykt | **FAIL** |
| Błąd | `column "name" of relation "ai_report_categories" does not exist` |

**Przyczyna:** konflikt schematu `ai_report_categories` między `ai_module` a `finance_module`/`inventory_module` w skonsolidowanym baseline (różne kolumny w INSERT/DDL).

**Naprawa 17.3 (częściowa):** usunięto broken SELECT po stripperze (linia ~5052).

### Fallback: 69 migracji źródłowych (per-file)

| Metryka | Po partial apply |
|---------|------------------|
| Tabele | **60** |
| Enumy | **51** |
| Funkcje | **124** |
| RPC | **5** |
| Polityki RLS | **132** |
| Triggery | **104** |
| Buckety | **1** (`club-assets`) |

**Pierwszy FAIL per-file:**

```
20260602140000_public_players_league_stats.sql
→ relation "public.league_player_registry" does not exist
```

**Root cause:** RPC migracja **przed** `stage15b_league_hub` ( który tworzy `league_player_registry`). Clean apply w sortowaniu chronologicznym **nie przechodzi** — to blocker rebuild od zera.

**Werdykt FAZA 2:** **FAIL**

---

## FAZA 3 — Parity Patch Apply

| Metryka | Wynik |
|---------|-------|
| Werdykt | **FAIL** |
| Błąd | `syntax error at or near "NOT"` |

Patch uruchamiany po partial baseline (60 tabel) — `CREATE TABLE IF NOT EXISTS` w `DO $$ BEGIN CREATE TYPE` + partial state powoduje błąd składni.

Na **pełnym** baseline (148 tabel) patch powinien być mostem no-op / idempotent — **wymaga weryfikacji na Supabase cloud**.

**Werdykt FAZA 3:** **FAIL** (nieweryfikowalny bez pełnego baseline)

---

## FAZA 4 — Bootstrap Club

**Status:** **SKIP** — brak działającego staging Supabase.

Przygotowany skrypt (gotowy do uruchomienia po staging):

```bash
node scripts/bootstrap-club.mjs \
  --slug staging-united \
  --name "Staging United" \
  --short-name SU \
  --colors "#1e3a5f,#f5c518,#ffffff" \
  --owner-email owner@staging.local
```

---

## FAZA 5 — Schema Validation (staging partial vs baseline)

| Metryka | Oczekiwane | Partial staging |
|---------|------------|-----------------|
| missing tables | 0 | **88** |
| missing enums | 0 | ~78 |
| missing RPC | 0 | **14** |

**Werdykt:** **FAIL**

Pełny diff: `docs/architecture/sprint-175-validation-results.json` → `schemaValidation.missingTables`

---

## FAZA 6 — Module Smoke Tests

| # | Moduł | Werdykt | Uwagi |
|---|-------|---------|-------|
| 1 | Auth | FAIL | brak pełnego profiles/memberships flow |
| 2 | Website | FAIL | brak website_* |
| 3 | Teams | FAIL | teams OK partial — brak pełnego kontekstu |
| 4 | Players | FAIL | players istnieje — brak league RPC |
| 5 | League | FAIL | league_player_registry missing |
| 6 | CRM | FAIL | |
| 7 | Attendance | FAIL | |
| 8 | Communication | FAIL | |
| 9 | Equipment | FAIL | |
| 10 | Injuries | FAIL | player_injuries partial |
| 11 | Finance | **PASS** | tabele finance_* utworzone |
| 12 | Inventory | **PASS** | tabele inventory_* utworzone |
| 13 | Academy | FAIL | |
| 14 | Integrations | FAIL | |

**Werdykt:** **FAIL** (2/14 PASS na partial embedded run)

---

## FAZA 7 — Migration Safety

Utworzono: `supabase/migrations-forward/20260705000000_test_validation.sql`

| Test | Wynik |
|------|-------|
| Apply test migration | PASS |
| Insert do schema_migrations | PASS |
| Wersja `20260705000000` tracked | PASS |

**Werdykt FAZA 7:** **PASS**

---

## FAZA 8 — Production Readiness (Sprint 17.6)

### Czy można przejść do **17.6 Production Parity Execution**?

## **NIE**

### Blokery

1. **Brak Supabase cloud staging** — `SUPABASE_ACCESS_TOKEN` wymagany
2. **Migration order bug** — `20260602140000_public_players_league_stats.sql` przed `league_player_registry`
3. **baseline.sql monolith** — konflikt `ai_report_categories` (kolumny)
4. **Pełny smoke test** — niewykonany (bootstrap, auth, website, league)

### Checklist przed 17.6 (gdy blokery usunięte)

- [ ] Utworzyć `FCOS-STAGING-173` via Management API
- [ ] Apply baseline (monolit lub naprawiona kolejność migracji)
- [ ] Apply `prod-parity-patch.sql` — zero SQL errors
- [ ] `audit-prod-parity-174.mjs` → missingTables = 0
- [ ] `bootstrap-club.mjs` → club + website + league skeleton
- [ ] Smoke test 14/14 PASS
- [ ] PITR backup prod verified
- [ ] Maintenance window approved

---

## Metryki końcowe (partial embedded run)

| Metryka | Wartość |
|---------|---------|
| Tabele | **61** (60 + test marker) |
| Funkcje | **124** |
| RPC | **5** |
| Polityki RLS | **132** |
| Triggery | **104** |
| Buckety | **1** |

*(Docelowe po pełnym apply: 148 / ~213 / 19 / ~244 / ~221 / 2)*

---

## Artefakty Sprint 17.5

| Plik | Opis |
|------|------|
| `scripts/staging-create-project-175.mjs` | Tworzenie FCOS-STAGING-173 |
| `scripts/staging-run-validation-175.mjs` | Walidacja embedded (dev fallback) |
| `scripts/staging-apply-migrations-175.mjs` | Apply na `.env.staging.local` |
| `supabase/migrations-forward/20260705000000_test_validation.sql` | Test migration |
| `docs/architecture/sprint-175-validation-results.json` | Pełny log |
| `.env.staging.example` | Szablon staging env |

---

## Rekomendacje Sprint 17.5b (przed 17.6)

1. **Dodać `SUPABASE_ACCESS_TOKEN`** i utworzyć cloud staging
2. **Naprawić kolejność migracji:** przenieść `public_players_league_stats` po `stage15b_league_hub` (Sprint 17.5b — zmiana repo)
3. **Naprawić baseline.sql:** ujednolicić `ai_report_categories` schema
4. **Re-run** pełną walidację na cloud staging
5. Dopiero potem **17.6 prod parity execution**

---

## GO / NO-GO

### **NO-GO** dla Sprintu 17.6

FC OS **nie został** uruchomiony od zera na Supabase staging. Udowodniono częściowo (Finance + Inventory tabele, migration tracking), ale **nie** kompletny rebuild 148 tabel ani smoke testy 14/14.

**Minimalny krok odblokowujący:** `SUPABASE_ACCESS_TOKEN` + utworzenie `FCOS-STAGING-173`.
