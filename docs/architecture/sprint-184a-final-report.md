# Sprint 18.4a + 18.4a-db — Platform Dashboard & Club Activation

**Status:** COMPLETE (kod + migracja DB) · **Deploy Vercel:** PENDING (push)  
**Data:** 2026-06-04  
**Commit lokalny:** `77a7257`  
**Produkcja:** https://pilka-mu.vercel.app

---

## Executive summary

Sprint 18.4a domyka **operacyjny onboarding klubu bez developera** (po 18.2 Create Club i 18.3 League Setup):

- Dashboard operatora na `/platform`
- Bramki aktywacji (G1–G5) + karta **Aktywuj klub**
- Hotfix DB **18.4a-db** — RPC omijające `protect_club_columns` bez osłabiania security hardening

---

## Zależności (wcześniejsze sprinty)

| Sprint | Co dostarcza |
|--------|----------------|
| **18.1** | Multi-club routing `/{slug}/*`, directory `/` przy 2+ active |
| **18.2** | Create Club wizard, `createClub()`, onboarding `clubs.status` |
| **18.3** | League Setup wizard, `saveLeagueConfiguration`, `activateLeagueSync` |
| **18.3d** | Hotfix `availability_reasons` unique index (ON CONFLICT przy bootstrap) |
| **18.4a** | Dashboard + aktywacja klubu |
| **18.4a-db** | RPC `platform_append_club_audit`, `platform_set_club_status` |

---

## 18.4a — zakres kodu

### Nowe pliki

| Plik | Rola |
|------|------|
| `src/lib/platform/club-activation.ts` | Bramki G1–G5, `evaluateClubActivationGates()`, `activateClub()` |
| `src/lib/platform/dashboard.ts` | `loadPlatformDashboard()` — KPI, tabele |
| `src/lib/platform/club-db-writes.ts` | Wrappery RPC do PG |
| `src/features/platform/components/platform-dashboard.tsx` | UI dashboardu |
| `src/features/platform/components/club-activation-card.tsx` | UI bramek + przycisk aktywacji |

### Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/(platform)/platform/page.tsx` | Dashboard zamiast `redirect(/platform/clubs)` |
| `src/app/(platform)/platform/clubs/[clubId]/page.tsx` | `ClubActivationCard` |
| `src/features/platform/actions.ts` | `activateClubAction`, `fetchClubActivationGates` |
| `src/features/platform/components/platform-shell.tsx` | Nav: Dashboard \| Kluby \| Nowy klub |
| `src/lib/platform/league-setup.ts` | Audit przez `platformAppendClubAudit` (18.4a-db) |

### Trasy Platform Admin

```
/platform                              → Dashboard (KPI)
/platform/clubs                        → Lista klubów
/platform/clubs/new                    → Create Club wizard (18.2)
/platform/clubs/[clubId]               → Detail + onboarding + activation
/platform/clubs/[clubId]/league        → League status (18.3)
/platform/clubs/[clubId]/league/setup  → League Setup wizard (18.3)
```

### Auth

- `PLATFORM_ADMIN_EMAILS` w ENV (comma-separated)
- `requirePlatformAdmin()` w `(platform)/layout.tsx` i server actions
- Produkcja: `wlasciciel@piorun.test` (wg dokumentacji sesji)

### Bramki aktywacji (G1–G5)

| Gate | Warunek |
|------|---------|
| G1 | Owner `club_memberships.status = active` |
| G2 | `website_settings` istnieje |
| G3 | Liga skonfigurowana (`configuredVia: platform_league_wizard`, nie bootstrap-only) |
| G4 | `validateLeagueConfiguration` ≠ FAIL |
| G5 | Slug unikalny + `validateClubSlug()` |

Soft warnings: brak logo, brak udanego sync.

### Audit (`clubs.settings.platformAudit`)

| Akcja | Kiedy |
|-------|-------|
| `club_created` | Create Club |
| `league_configuration_saved` | Save league config |
| `league_sync_activated` | Activate league sync |
| `club_activated` | Activate club (18.4a) |

---

## 18.4a-db — hotfix DB

### Problem

Migracja `20260531140000_security_hardening.sql` — trigger `clubs_protect_columns` blokuje UPDATE na:
`id`, `slug`, `country`, `status`, `settings`

Dotknięte: `saveLeagueConfiguration()` (settings), `activateClub()` (status + settings).

### Rozwiązanie

1. Trigger: bypass gdy `current_setting('fcos.platform_club_write', true) = '1'`
2. RPC **SECURITY DEFINER** ustawiają flagę transaction-local i wykonują allowlisted UPDATE
3. `REVOKE` od PUBLIC — brak grantu dla `authenticated` (tylko serwer przez `connectServerDb`)

### Migracja

`supabase/migrations/20260604140000_hotfix_184adb_platform_club_writes.sql`

| Funkcja | Rola |
|---------|------|
| `platform_append_club_audit(club_id, entry jsonb)` | Merge `platformAudit[]` |
| `platform_set_club_status(club_id, status, audit_entry?)` | `onboarding` → `active` (whitelist) |

**Status prod:** migracja **zastosowana** (zweryfikowano smoke).

---

## Walidacja

| Check | Wynik |
|-------|--------|
| typecheck / lint / build | PASS |
| Smoke lib (save, activate, pilot) | PASS po 18.4a-db |
| Post-deploy Vercel 18.4a UI | **FAIL** — `77a7257` nie na `origin/main` (ahead 1) |

### Prod DB (2026-06-04)

| Klub | status |
|------|--------|
| `piorun-wawrzenczyce` | active |
| `pilot-club-test` | active |
| `release-184a-mpz313we` | onboarding (śmieciowy klub ze smoke — do archiwizacji) |

Public: `/` directory, `/pilot-club-test` 200, sitemap OK.

---

## Operator flow (docelowy)

1. `/platform/clubs/new` — Create Club → `onboarding`
2. `/platform/clubs/[id]/league/setup` — League Setup + activate sync
3. `/platform/clubs/[id]` — wszystkie gate PASS → **Aktywuj klub** → `active`
4. Public `/{slug}` live, cron mirror live (jeśli mirror_live + active)

---

## Następne kroki (18.4b+)

- Push + deploy `77a7257`
- Smoke UI zalogowany platform admin
- Archiwizacja `release-184a-*` i ewentualnie `pilot-club-test`
- Sprint 18.4b: monitoring, Sentry, centralny audit table (audyt 18.4)

---

## Pliki poza commitem 18.4a (nie stage'ować)

- `scripts/_hotfix-184adb-*.mjs`, `scripts/_release-184a-validate.mjs` — smoke lokalny
- `fixtures/league/live/*` — niezwiązane
- `supabase/migrations/20260604120000_hotfix_183d_*` — osobny hotfix (już na prod)
