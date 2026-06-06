# Sprint 17.3 — Baseline Generation Final Report

**Data:** 2026-06-03  
**Zakres:** baseline.sql, bootstrap design, migration strategy  
**Produkcja:** nietknięta · brak deploy · brak commit

---

## Deliverables

| Artefakt | Ścieżka |
|----------|---------|
| Baseline SQL | `supabase/baseline.sql` (~548 KB) |
| Classification (JSON) | `docs/architecture/sprint-173-migration-classification.json` |
| Classification (tabela) | `docs/architecture/sprint-173-migration-classification.md` |
| Validation (JSON) | `docs/architecture/sprint-173-baseline-validation.json` |
| Migration strategy | `docs/architecture/sprint-173-migration-strategy.md` |
| Bootstrap script | `scripts/bootstrap-club.mjs` |
| Generator | `scripts/generate-baseline-173.mjs` |
| Validator | `scripts/validate-baseline-173.mjs` |

---

## Metryki końcowe

| Metryka | Wartość |
|---------|---------|
| Migracje historyczne (repo) | **105** |
| Migracje w baseline (źródła) | **69** |
| Migracje do archiwizacji | **36** |
| Tabele w baseline | **148** |
| Funkcje (unique names) | **213** |
| RPC publiczne (`get_*`, `list_*`) | **19** |
| CREATE POLICY (w pliku)* | **451** |
| Polityki RLS na prod (live) | **244** |
| Storage buckets | **2** (`club-assets`, `club-videos`) |
| Referencje Piorun UUID w baseline | **0** |
| Stripped data blocks | **33** |

\*Liczba CREATE POLICY w pliku jest zawyżona przez historię DROP/CREATE w źródłowych migracjach. Po apply na clean DB efektywna liczba ≈ 240–280 (prod 244 + moduły nigdy zmigrowane).

---

## 1. Migration Classification Report

Pełna tabela 105 wierszy: [`sprint-173-migration-classification.md`](./sprint-173-migration-classification.md)

### Podział kategorii (plik może mieć wiele kategorii)

| Kategoria | Pliki dotknięte |
|-----------|-----------------|
| CORE_SCHEMA (A) | ~49 |
| RLS_SECURITY (B) | ~43 |
| FUNCTIONS_RPC (C) | ~60 |
| SEED_DATA (D) | **25** — wyłączone z baseline |
| CLUB_SPECIFIC (E) | **9** — wyłączone z baseline |
| HISTORICAL_FIX (F) | **3** data-only wyłączone; fixy funkcji włączone do baseline |

### Wyłączone z baseline (36)

**D — SEED_DATA (25):** wszystkie `seed_*.sql`

**E — CLUB_SPECIFIC (9):**
- `league_mirror_live_source.sql`
- `website_40_copy.sql`
- `piorun_facebook_content.sql`
- `piorun_p1_real_content.sql`
- `piorun_media_quality_hotfix.sql`
- `piorun_contact_mockup.sql`
- `piorun_logo_cover_mockup.sql`
- `piorun_mockup_visual_assets.sql`
- `piorun_logo_crest_upgrade.sql`

**F — HISTORICAL_FIX data-only (3):**
- `league_table_entries_cleanup.sql`
- `stage156_team_ids_fix.sql`
- `stage159_ensure_player_guardians.sql`

**W baseline mimo nazwy „fix” (finalny stan funkcji/RLS):**
- `stage15b_trigger_fix`, `stage15a_seed_trigger_fix`, `stage1510_sync_fix`
- `stage158_treasurer_fix`, `academy_audit_fixes`, `stage159_rls_fix`
- `public_website_last_result_date_fix`, `public_players_stats_fix`
- `public_home_bundle_academy_fix`
- `piorun_social_public_read` (tylko RLS — włączone)

---

## 2. Baseline Design Report

### Zasada

`baseline.sql` = **docelowy stan systemu**, skonsolidowany z 69 migracji źródłowych, z usuniętymi:
- INSERT/UPDATE/DELETE danych klubowych
- DO blocks z Piorun UUID
- SELECT z filtrem `club_id = Piorun`

### Zawiera

- Extensions (`pgcrypto`)
- Enums (129 CREATE TYPE + 25 ALTER TYPE ADD VALUE)
- 148 tabel
- Indeksy (251)
- Constraints, triggery (221)
- RLS policies
- 213 funkcji (w tym 19 RPC publicznych)
- Storage buckets + policies

### Nie zawiera

- Wierszy `clubs`, `teams`, `players`
- Konfiguracji ligi Piorun/GLKS
- Demo media / Facebook content
- One-shot data cleanup

### Apply order

```
1. Nowy projekt Supabase (pusty)
2. node scripts/run-sql.mjs supabase/baseline.sql
3. node scripts/bootstrap-club.mjs --slug ... (per klub)
```

---

## 3. Baseline Validation Report

**Metoda:** analiza statyczna pliku + read-only query prod (bez apply baseline).

| Test | Wynik |
|------|-------|
| Brak Piorun UUID | **PASS** |
| 148 tabel zdefiniowanych | **PASS** |
| Kluczowe RPC obecne w pliku | **PASS** |
| Parity z prod | **WARNING** |

### Diff baseline vs prod (tabele)

**44 tabele w baseline, brak na prod** (moduły nigdy zmigrowane na prod):

Finance (8), Inventory (14), Academy (10), Integrations (6), sync_* (3), scouting (3)

**0 tabel prod-only** — prod jest podzbiorem baseline.

### Uwaga

Baseline **nie był wykonany** na clean DB (brak Docker lokalnie). Walidacja runtime wymaga Phase B (nowy projekt Supabase staging).

Szczegóły: [`sprint-173-baseline-validation.json`](./sprint-173-baseline-validation.json)

---

## 4. Bootstrap Club Design

Skrypt: `scripts/bootstrap-club.mjs`

### Parametry CLI

| Parametr | Wymagany | Opis |
|----------|----------|------|
| `--slug` | ✅ | Unikalny slug URL |
| `--name` | ✅ | Nazwa publiczna |
| `--short-name` | ✅ | Skrót |
| `--colors` | ✅ | `#primary,#secondary,#accent` |
| `--owner-email` | ✅ | Email właściciela |
| `--official-name` | | Nazwa urzędowa |
| `--competition-level` | | np. B Klasa |
| `--voivodeship` | | Województwo |
| `--season` | | Domyślnie bieżący sezon szkolny |
| `--league-name` | | Szkielet rozgrywek |
| `--dry-run` | | Podgląd bez zapisu |

### Kroki automatyczne

| # | Akcja | Auto |
|---|-------|------|
| 1 | INSERT `clubs` (gen_random_uuid) | ✅ |
| 2 | INSERT domyślna drużyna seniorów | ✅ |
| 3 | INSERT `website_settings` + kolory | ✅ |
| 4 | INSERT `content_channels` (website, facebook, instagram) | ✅ |
| 5 | INSERT `league_seasons` + `league_competitions` | ✅ |
| 6 | INSERT `league_sources` (inactive, empty config) | ✅ |
| 7 | INSERT `availability_reasons` (6 kodów) | ✅ |
| 8 | Membership owner (profile exists) lub invite via Auth | ✅ |

### Kroki ręczne (poza skryptem)

| # | Akcja |
|---|-------|
| 1 | Apply `baseline.sql` na pustym projekcie |
| 2 | `PUBLIC_CLUB_SLUG` w Vercel |
| 3 | Konfiguracja `league_sources.config` |
| 4 | `npm run sync:league-live` (gdy gotowe) |
| 5 | Upload logo / media |
| 6 | Auth redirect URLs |
| 7 | DNS / domena |

---

## 5. Migration Strategy Report

Szczegóły: [`sprint-173-migration-strategy.md`](./sprint-173-migration-strategy.md)

| Faza | Cel | Dotyka prod? |
|------|-----|--------------|
| **A** | Archiwizacja 105 migracji, baseline w repo | ❌ |
| **B** | Walidacja na nowym Supabase / staging | ❌ |
| **C** | Prod parity + schema_migrations reconciliation | ✅ (osobny sprint) |

---

## 6. Production Safety Report

### Czy po wygenerowaniu baseline można bezpiecznie:

| Pytanie | Odpowiedź |
|---------|-----------|
| Zostawić starą produkcję bez zmian? | **TAK** |
| Rozwijać nowe migracje od baseline? | **TAK** (na nowych środowiskach od razu; na prod po Phase C) |

### Uzasadnienie

1. **`baseline.sql` nie został apply na prod** — zero wpływu runtime.
2. **Stare migracje pozostają w repo** — prod nadal działa na dotychczasowym schemacie.
3. **Nowe środowiska** mogą startować od baseline bez 105 plików historycznych.
4. **Prod** wymaga **Phase C** (forward patch 44 tabel) zanim będzie identyczny z baseline — to osobna operacja z backupem.
5. **Nowe migracje** od wersji `20260705*` mogą być pisane against baseline schema; na prod apply selective patch najpierw.

### Ryzyko jeśli ktoś apply baseline na prod

**KRYTYCZNE** — CREATE TABLE conflicts, partial failure. **Zabronione** bez Phase C planu.

---

## Następne kroki (Sprint 17.4 propozycja)

1. Staging Supabase → apply baseline → smoke test
2. Wygenerować `prod-parity-patch.sql` (44 tabele diff)
3. CI job: baseline apply + typecheck
4. Przenieść `migrations/` → `migrations-archive/`
5. Phase C na prod (maintenance window + PITR)

---

## Sukces Sprintu 17.3

| Cel | Status |
|-----|--------|
| `baseline.sql` | ✅ Wygenerowany |
| Projekt bootstrapu klubu | ✅ `bootstrap-club.mjs` |
| Strategia migracji | ✅ Phase A/B/C |
| Bez dotykania prod | ✅ |
| Pełna klasyfikacja 105 migracji | ✅ |

FC OS posiada nowoczesny punkt startowy **bez zależności od 105 historycznych migracji** dla nowych środowisk.
