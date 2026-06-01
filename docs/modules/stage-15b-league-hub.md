# ETAP 15B — League Hub

Moduł centralnego zarządzania rozgrywkami dla Football Club OS.

## Zakres

- Sezony (`league_seasons`)
- Rozgrywki (`league_competitions`)
- Mapowanie drużyn (`league_teams`) — np. Piorun Wawrzeńczyce ↔ GLKS Mietków
- Import terminarzy, wyników, tabel (`league_matches`, `league_tables`)
- Sync Center (`league_sync_jobs`, `league_sync_logs`)
- Rejestr zawodników (`league_player_registry`)
- Konflikty (`league_conflicts`)
- Integracja z modułem **Mecze** (`match_id` FK, bez duplikacji)
- AI Match Insights (`getLeagueInsights`)

## Architektura integracji

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Źródła      │────▶│ LeagueSource     │────▶│ league_* staging│
│ CSV/JSON/   │     │ Adapter          │     │ tables          │
│ XLSX/API*   │     └──────────────────┘     └────────┬────────┘
└─────────────┘                                       │
                                                      ▼
                                            ┌─────────────────┐
                                            │ Sync Engine     │
                                            │ sync.ts         │
                                            └────────┬────────┘
                                                     │
                     ┌───────────────────────────────┼───────────────────────────────┐
                     ▼                               ▼                               ▼
              ┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
              │ matches     │                 │ league_table│                 │ league_     │
              │ (Mecze)     │                 │ _entries    │                 │ conflicts   │
              └─────────────┘                 └─────────────┘                 └─────────────┘
```

\* `FutureApiAdapter` i `ExtranetAdapter` — placeholdery bez nieautoryzowanego pobierania.

## Warstwa adapterów

| Adapter | Plik | Opis |
|---------|------|------|
| `CsvLeagueAdapter` | `src/lib/league/adapters/index.ts` | CSV tabela / terminarz |
| `JsonLeagueAdapter` | j.w. | JSON strukturalny |
| `XlsxLeagueAdapter` | j.w. | Placeholder — eksport do CSV lub SheetJS w przyszłości |
| `FutureApiAdapter` | j.w. | Oficjalne API PZPN/DZPN (gdy dostępne) |
| `ExtranetAdapter` | j.w. | Raporty meczowe — placeholder |
| `ManualAdapter` | j.w. | Alias CSV dla wpisów ręcznych |

Interfejs: `LeagueSourceAdapterInterface` w `src/lib/league/adapters/types.ts`.

## Synchronizacja

1. **Import** — `importLeagueFileAction` → adapter → `ingestLeaguePayload`
2. **Sync** — `runLeagueSyncJob` → `syncLeagueTableToMatchesModule` + `syncLeagueMatchesToModule`
3. **Konflikty** — różnice wyników → `league_conflicts` → `resolveLeagueConflictAction`

Statusy sync: `pending` | `running` | `completed` | `failed` | `cancelled`

## Bezpieczeństwo

- RLS na wszystkich tabelach `league_*`
- `actor_can_read_league`: owner, president, sports_director, coach, player
- `actor_can_manage_league` / sync: owner, president, sports_director
- Sponsor: **brak dostępu** (nie w liście ról read)
- Brak scrapera / omijania zabezpieczeń PZPN/DZPN

## Ograniczenia PZPN / DZPN

- PZPN nie udostępnia stabilnego publicznego API terminarzy dla klubów amatorskich
- DZPN — dane przez import ręczny CSV/JSON/XLSX lub przyszłe oficjalne API
- System **nie pobiera** danych nieautoryzowanymi metodami

## UI (PWA)

Ścieżki: `/league`, `/league/table`, `/league/fixtures`, `/league/import`, `/league/sync`, `/league/teams`, `/league/players`, `/league/sources`

Mobilne: sub-nav z `min-h-[44px]`, quick action „League Hub”, offline shell w SW.

## Migracje

```bash
npm run setup:stage15b
# lub
npm run db:migrate:stage15b
```

Pliki:
- `supabase/migrations/20260618120000_stage15b_league_hub.sql`
- `supabase/migrations/20260618121000_seed_stage15b_league.sql`

## Dane testowe

Klub: **Piorun Wawrzeńczyce** — nazwa ligowa **GLKS Mietków**, rozgrywki **B Klasa** sezon **2025/2026**.
