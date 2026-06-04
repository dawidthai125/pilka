# Sprint 18.6C — Alerts Polish (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Wynik (lokalnie, 2026-06-04)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | PASS |
| `validate-186b-platform-alerts.mjs` | PASS (dedup unit + source constraints) |
| `validate-185b-health-v2.mjs` | PASS |
| `validate-185c-sync-history.mjs` | PASS |

## Kryteria akceptacji

- [x] Jeden klub z wieloma CRITICAL (health + freshness + failures) → jedna karta + `factors`
- [x] Cron FAIL na początku listy
- [x] Opisy po polsku, nie kody typu `freshness_critical` jako tytuł
- [x] Empty state z komunikatem pozytywnym
- [x] Podsumowanie CRITICAL / WARNING / INFO nad listą
- [x] Kluby testowe nie dominują listy
- [x] Brak nowych loaderów / RPC / migracji
- [x] Brak commita (zgodnie z poleceniem)

## Test jednostkowy (validator 186b)

Scenariusz: `cronStatus: FAIL`, klub z score 45, freshness 100 h, 2 failures → oczekiwane:

- pierwszy alert: `cron_fail`
- jeden alert CRITICAL dla `club-a` z `factors.length >= 2`

## Ręczny smoke (produkcja / staging)

1. `/platform/monitoring` — sekcja Platform Alerts.
2. Klub z wieloma problemami — jedna czerwona karta + lista czynników.
3. Brak alertów — zielony empty state.
4. Klik alert → Sync History z filtrami (`filtersFromAlert` bez zmian kontraktu `clubId` / `sourceId`).
