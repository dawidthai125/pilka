# Sprint 19.1 — Club Attention Dashboard (walidacja)

## Komendy

```bash
npm run typecheck
node scripts/validate-191a-club-attention-dashboard.mjs
node scripts/validate-190b-club-operations-registry.mjs
node scripts/validate-186b-platform-alerts.mjs
node scripts/validate-185b-health-v2.mjs
node scripts/validate-185c-sync-history.mjs
```

## Wynik (lokalnie, 2026-06-04)

| Check | Wynik |
|-------|--------|
| `npm run typecheck` | PASS |
| `validate-191a-club-attention-dashboard.mjs` | PASS |
| `validate-190b-club-operations-registry.mjs` | PASS |
| `validate-186b-platform-alerts.mjs` | PASS |
| `validate-185b-health-v2.mjs` | PASS |
| `validate-185c-sync-history.mjs` | PASS |

## Smoke

1. `/platform` — sekcja attention z CRITICAL/WARNING jeśli są.
2. Top alerty — klik otwiera Monitoring z filtrem klubu.
3. Onboarding — brakujące kroki checklisty.
4. Szybkie akcje — linki działają bez nowych tras.
