# Sprint 18.3 — League Setup Wizard

**Status:** COMPLETE (implementation)  
**Production deploy:** NOT executed  
**Date:** 2026-06-03

---

## Executive summary

Sprint 18.3 przenosi konfigurację ligi z JSON/skryptów/ENV do **UI Platform Admin**. Operator platformy konfiguruje sezon, rozgrywki, źródła (Mirror live / import ręczny), waliduje konfigurację i aktywuje sync — bez edycji JSON, SQL ani CLI.

**Wejście:** `/platform/clubs/{clubId}/league/setup`  
**Status:** `/platform/clubs/{clubId}/league`  
**Wymaganie dostępu:** `PLATFORM_ADMIN_EMAILS` + `SUPABASE_DB_PASSWORD` (transakcje zapisu)

---

## FAZA 1 — League Audit Report

### `league_seasons`

| Pole | Wymagane | Operator | Techniczne |
|------|----------|----------|------------|
| `name` | tak | tak | — |
| `is_active` | tak | ukryte (auto TRUE) | — |
| `start_date` | nie | nie | auto CURRENT_DATE |
| `club_id` | tak | ukryte | FK |

### `league_competitions`

| Pole | Wymagane | Operator | Techniczne |
|------|----------|----------|------------|
| `name` | tak | tak | — |
| `season_id` | tak | ukryte | FK z sezonu |
| `category_label` | nie | tak (opcj.) | — |
| `provider` | nie | ukryte | z presetu źródła |
| `is_active` | tak | ukryte | auto TRUE |

### `league_sources`

| Pole | Wymagane | Operator | Techniczne |
|------|----------|----------|------------|
| `name` | tak | ukryte | z presetu providera |
| `adapter` | tak | ukryte | json/csv z providera |
| `provider_label` | nie | ukryte | — |
| `competition_id` | tak | ukryte | FK |
| `is_active` | tak | krok Sync | FALSE do aktywacji |
| `config` | tak | formularz → JSON | lnp.*, URLs, cron |
| `last_sync_at` | nie | read-only status | — |

### Sync pipeline

- **Wewnętrzny:** `runLeagueSyncJob` — liga → moduł Mecze
- **Live fetch:** `sync-league-live.mjs` — 90minut, regionalnyfutbol, regiowyniki, mPZPN
- **Cron:** `/api/cron/league-sync` — wszystkie kluby Mirror live

### LNP (per-klub w `config.lnp`)

| Pole | Operator | Uwagi |
|------|----------|-------|
| `accessToken` | tak (password) | opcjonalne |
| `teamId` | tak (UUID) | wymagane razem z tokenem |
| `seasonId`, `leagueId` | techniczne | opcjonalne |

---

## FAZA 2–3 — Onboarding Flow + UI

| Krok | Sekcja kreatora |
|------|-----------------|
| 1 | Source — Mirror live / Import ręczny |
| 2 | Competition — nazwa ligi |
| 3 | Season — sezon + URL-e + mPZPN |
| 4 | Validation — zapis + PASS/WARNING/FAIL |
| 5 | Sync — aktywacja |

---

## FAZA 4 — Server Actions

| Funkcja | Plik |
|---------|------|
| `saveLeagueConfiguration()` | `src/lib/platform/league-setup.ts` |
| `validateLeagueConfiguration()` | `src/lib/platform/league-setup.ts` |
| `activateLeagueSync()` | `src/lib/platform/league-setup.ts` |
| `saveLeagueConfigurationAction()` | `src/features/platform/league-actions.ts` |
| `activateLeagueSyncAction()` | league-actions |
| `triggerLeagueLiveSyncAction()` | league-actions |

Tenant-aware (`clubId`), audit log, rollback przy błędzie, walidacja duplikatów LNP token+team.

---

## FAZA 5–7 — Validation / Sync / Safety

- Validation engine: `src/lib/platform/league-config-validation.ts`
- League Status: `/platform/clubs/{clubId}/league`
- Multi-tenant audit: **PASS** (`scripts/platform-league-safety-audit-183.mjs`)

---

## FAZA 8 — UX

| | Legacy | 18.3 Wizard |
|---|--------|-------------|
| Kroki | ~8 terminal | 5 UI + status |
| Kliknięcia | 0 (CLI) | ~14 |
| JSON/SQL/CLI | tak | nie |

---

## FAZA 9 — Nowe pliki

**Routes:** `platform/clubs/[clubId]/league`, `.../league/setup`

**Lib:** `league-providers.ts`, `league-config-validation.ts`, `league-setup.ts`, `league-actions.ts`

**Components:** `league-setup-wizard.tsx`, `league-status-panel.tsx`, `league-validation-panel.tsx`

**Scripts:** `platform-league-safety-audit-183.mjs`, aktualizacje LNP per-club w `league-club-config.mjs`

---

## FAZA 10 — Final Verdict

| Akcja | Bez CLI/JSON/SQL/dev |
|-------|----------------------|
| Utworzyć klub | **TAK** (18.2) |
| Skonfigurować ligę | **TAK** |
| Uruchomić pierwszy sync | **TAK** |

### **TAK** (warunkowo)

Warunki: `PLATFORM_ADMIN_EMAILS`, `SUPABASE_DB_PASSWORD`, URL-e lig dla Mirror live, opcjonalnie token mPZPN (wygasa).

```bash
npm run typecheck                              # PASS
node scripts/platform-league-safety-audit-183.mjs  # PASS
```
