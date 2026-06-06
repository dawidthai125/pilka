# Sprint 19.2B — Lifecycle Hardening (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-192b-lifecycle-hardening.mjs
node scripts/validate-191a-club-attention-dashboard.mjs
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Przed testem Restore w środowisku

Zastosuj na Supabase (jednorazowo):

```bash
psql $DATABASE_URL -f scripts/sql/hotfix-192b-platform-restore-club.sql
```

## Wynik (lokalnie, 2026-06-04)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `validate-192b-lifecycle-hardening.mjs` | **PASS** |
| `validate-191a-club-attention-dashboard.mjs` | **PASS** |
| `validate-190b-club-operations-registry.mjs` | **PASS** |
| `validate-186b-platform-alerts.mjs` | **PASS** |
| `validate-185b-health-v2.mjs` | **PASS** (live RPC: 2 kluby) |
| `validate-185c-sync-history.mjs` | **PASS** |

## Smoke

1. Zarchiwizowany klub → **Restore** → status onboarding, audit `club_restored` w Audit Center.
2. Klub z owner `invited` → **Resend invite** (jeśli Auth pozwala).
3. Create z „Klub testowy” → `settings.isTest`, ukryty w attention przy włączonym filtrze.
4. Aktywacja po restore — gates G1–G5 jak przy pierwszym onboardingu.

## Finalizacja produkcyjna (2026-06-05)

Środowisko: Supabase z `.env.local` (FC OS prod — `pwkqnwqvrdiaycveacxa`).

### Krok 1 — Hotfix SQL

```text
scripts/sql/hotfix-192b-platform-restore-club.sql → HOTFIX_APPLY: PASS
```

### Krok 2 — `platform_set_club_status`

| Sprawdzenie | Wynik |
|-------------|--------|
| RPC istnieje | PASS |
| Target `onboarding` w definicji | PASS |
| Reguła `archived → onboarding` | PASS |
| Blokada `archived → active` | PASS |

### Krok 3 — Smoke E2E (`pilot-club-test`)

| Krok | Wynik |
|------|--------|
| `active` → `archived` | PASS |
| `archived` → `onboarding` (restore) | PASS |
| Gates aktywacji (G1–G3) | PASS |
| `onboarding` → `active` | PASS |
| Stan końcowy | `active` (bez regresji) |

### Krok 4 — Audit trail (`settings.platformAudit`)

| Akcja | Obecna |
|-------|--------|
| `club_created` | PASS |
| `club_activated` | PASS |
| `club_archived` | PASS |
| `club_restored` | PASS |

### Raport końcowy

| Obszar | Wynik |
|--------|--------|
| **SQL** | **PASS** |
| **Restore Flow** | **PASS** |
| **Audit Trail** | **PASS** |
| **Production Readiness** | **GO** |

Uwaga operacyjna: hotfix jest w `scripts/sql/` (poza `supabase/migrations/`). Na każdym nowym środowisku wymaga jednorazowego `psql -f`.

## Poza zakresem (potwierdzone)

- suspended, archived → active, email/webhook alerts, alert history
