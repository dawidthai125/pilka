# Sprint 19.3B — SaaS Readiness P0 (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-193b-saas-readiness-p0.mjs
node scripts/validate-192b-lifecycle-hardening.mjs
node scripts/validate-191a-club-attention-dashboard.mjs
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Wynik (lokalnie)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `validate-193b-saas-readiness-p0.mjs` | **PASS** |
| `validate-192b-lifecycle-hardening.mjs` | **PASS** |
| `validate-191a-club-attention-dashboard.mjs` | **PASS** |
| `validate-190b-club-operations-registry.mjs` | **PASS** |
| `validate-186b-platform-alerts.mjs` | **PASS** |
| `validate-185b-health-v2.mjs` | **PASS** |
| `validate-185c-sync-history.mjs` | **PASS** |

## Smoke (manual)

1. `/platform/clubs` — domyślnie 25 wierszy, zmiana pageSize, filtr status, wyszukiwanie `q`.
2. `/platform/clubs/[id]` — szybkie ładowanie szczegółów (bez timeout przy wielu klubach).
3. `/platform/monitoring` — Club/League Health paginacja, alerty bez regresji.
4. Archive/restore — audit max 100 wpisów (po hotfix SQL na DB).

## SQL hotfix (prod)

```bash
psql $DATABASE_URL -f scripts/sql/hotfix-193b-platform-audit-prune.sql
```

## Finalizacja produkcyjna (2026-06-05)

| Check | Wynik |
|-------|--------|
| Hotfix apply | **PASS** |
| `platform_prune_platform_audit` (105→100) | **PASS** |
| `platform_append_club_audit` cap w TX | **PASS** |
| ROLLBACK bez regresji | **PASS** |

Szczegóły: [sprint-193b-saas-readiness-p0-finalization.md](./sprint-193b-saas-readiness-p0-finalization.md)
