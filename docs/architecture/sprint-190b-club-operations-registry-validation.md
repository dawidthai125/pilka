# Sprint 19.0B — Club Operations Registry (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Wynik (lokalnie, 2026-06-04)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | PASS |
| `validate-190b-club-operations-registry.mjs` | PASS |
| `validate-186b-platform-alerts.mjs` | PASS |
| `validate-185b-health-v2.mjs` | PASS |
| `validate-185c-sync-history.mjs` | PASS |

## Kryteria 19.0B

- [x] `/platform/clubs` — rozszerzony rejestr operacyjny
- [x] Kolumny: nazwa, slug, status, owner, health score/status, ostatni sync, liga, data utworzenia
- [x] Filtry: Active, Onboarding, Archived, Requires Attention
- [x] Wyszukiwanie nazwa/slug (client-side)
- [x] Health v2 bez ponownego liczenia per klub (jeden context)
- [x] Archive + potwierdzenie (RPC istniejący)
- [x] Unarchive — pominięte (backend nie wspiera)
- [x] Health score → Monitoring `?clubId=`
- [x] Brak nowych tabel/RPC/migracji/API
- [x] Brak commita

## Smoke manualny

1. `/platform/clubs` — podsumowanie KPI, filtry, tabela z health.
2. `?status=attention` — tylko WARNING/CRITICAL (bez archived).
3. Wyszukaj fragment slug/nazwy.
4. Klik score → Monitoring z filtrem klubu i scroll do historii.
5. Active klub → Archive → confirm → status Archiwum, brak w cron/public.
