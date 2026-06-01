# Raport ETAP 15B — League Hub

**Data:** 2026-05-31  
**Klub testowy:** Piorun Wawrzeńczyce / GLKS Mietków  
**Status:** Zakończony (ETAP 15B)

## Wykonane prace

### Baza danych
- Migracja `20260618120000_stage15b_league_hub.sql` — 10 tabel, enumy, RLS, triggery spójności
- Seed `20260618121000_seed_stage15b_league.sql` — sezony, B Klasa, drużyny, tabela, terminarz, sync job

### Backend
- `src/lib/league/` — adapters, sync engine, loaders, mappers, helpers, insights
- `src/features/league/actions.ts` — import, sync, konflikty, CRUD teams/players/sources
- Uprawnienia: `league:read`, `league:manage`, `league:sync`

### UI
- 8 widoków pod `/league/*` z sub-nawigacją PWA
- Dashboard: tabela, wyniki, terminarz, statystyki, AI insights
- Sync Center z logami i rozwiązywaniem konfliktów

### Integracje
- **Mecze:** synchronizacja przez `match_id`, deduplikacja po dacie + drużynach
- **Content Hub:** hook informacyjny — AI może generować relacje po sync (powiązanie `match_id`)
- **AI Agent:** narzędzie `getLeagueInsights`

### PWA / nawigacja
- Middleware `/league`, SW offline shell, quick action, dashboard nav (audience `league_staff`)

### Dokumentacja
- `docs/modules/stage-15b-league-hub.md` — architektura, adaptery, sync, bezpieczeństwo, PZPN/DZPN

## Świadome ograniczenia

- Brak biblioteki SheetJS — XLSX wymaga eksportu CSV lub przyszłej integracji
- `FutureApiAdapter` / `ExtranetAdapter` — placeholdery bez sieciowego pobierania
- Moduł `/integrations` (ETAP 10) pozostaje — League Hub ujednolica widok rozgrywek

## Weryfikacja

```bash
npm run db:migrate:stage15b
npm run db:migrate:stage15b-audit
npm run audit:stage15b
npm run typecheck
npm run build
```

## Audyt bezpieczeństwa

Raport: [docs/audit/stage-15b-audit.md](audit/stage-15b-audit.md) — **PASS** (17/17)

## Następne kroki

Brak — nie przechodzić poza ETAP 15B bez osobnego zlecenia.
